import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProductService } from './product.service.js';
import { InMemoryProductRepository } from './product.repository.memory.js';
import { InMemoryCache } from '../../core/cache/memory.cache.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import type { CreateProductInput } from './product.types.js';

const validInput: CreateProductInput = {
  name: 'Mechanical Keyboard',
  priceSatang: 289000,
};

describe('ProductService', () => {
  let repository: InMemoryProductRepository;
  let cache: InMemoryCache;
  let service: ProductService;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    cache = new InMemoryCache();
    service = new ProductService(repository, cache);
  });

  describe('create', () => {
    it('assign an id, timestamps, and defaults', async () => {
      const product = await service.create(validInput);

      expect(product.id).toEqual(expect.any(String));
      expect(product.currency).toBe('THB');
      expect(product.stock).toBe(0);
      expect(product.isActive).toBe(true);
      expect(product.description).toBeNull();
      expect(product.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getById', () => {
    it('returns the product when it exists', async () => {
      const created = await service.create(validInput);

      const found = await service.getById(created.id);

      expect(found).toEqual(created);
    });

    it('throws NotFoundError when it does not exist', async () => {
      await expect(service.getById('missing-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('list', () => {
    it('hides inactive products by default', async () => {
      const visible = await service.create(validInput);
      const hidden = await service.create({ ...validInput, name: 'Old Mouse' });
      await service.update(hidden.id, { isActive: false });

      const products = await service.list({ limit: 10, offset: 0 });

      expect(products).toHaveLength(1);
      expect(products[0]?.id).toBe(visible.id);
    });

    it('include inactive products when asked', async () => {
      const hidden = await service.create(validInput);
      await service.update(hidden.id, { isActive: false });

      const products = await service.list({
        limit: 10,
        offset: 0,
        includeInactive: true,
      });

      expect(products).toHaveLength(1);
    });

    it('respects limit and offset', async () => {
      await service.create({ ...validInput, name: 'First' });
      await service.create({ ...validInput, name: 'Second' });
      await service.create({ ...validInput, name: 'Third' });

      const page = await service.list({ limit: 2, offset: 0 });
      const nextPage = await service.list({ limit:2, offset: 2 });

      expect(page).toHaveLength(2);
      expect(nextPage).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('changes only the fields provided', async () => {
      const created = await service.create(validInput);

      const updated = await service.update(created.id, { priceSatang: 199000 });

      expect(updated.priceSatang).toBe(199000);
      expect(updated.name).toBe(created.name);
      expect(updated.createdAt).toEqual(created.createdAt);
    });

    it('clears the description when null is sent', async () => {
      const created = await service.create({
        ...validInput,
        description: 'clicky',
      });

      const updated = await service.update(created.id, { description: null });

      expect(updated.description).toBeNull();
    });

    it('throws NotFoundError for an unknown id', async () => {
      await expect(
        service.update('missing-id', { priceSatang: 1 }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('removes as existing product', async () => {
      const created = await service.create(validInput);

      await service.remove(created.id);

      await expect(service.getById(created.id)).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError for an unknown id', async () => {
      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('caching', () => {
    it('serve a repeated list from the cache', async () => {
      await service.create(validInput);
      const findAll = jest.spyOn(repository, 'findAll');

      await service.list({ limit: 10, offset: 0 });
      await service.list({ limit: 10, offset: 0 });

      expect(findAll).toHaveBeenCalledTimes(1);
    });

    it('treats a different page as a different key', async () => {
      const findAll = jest.spyOn(repository, 'findAll');

      await service.list({ limit: 10, offset: 0 });
      await service.list({ limit: 10, offset: 10});

      expect(findAll).toHaveBeenCalledTimes(2)
    });

    it('treats includeInactive as part of the key', async () => {
      const findAll = jest.spyOn(repository, 'findAll');

      await service.list({ limit: 10, offset: 0 });
      await service.list({ limit: 10, offset: 0, includeInactive: true });

      expect(findAll).toHaveBeenCalledTimes(2);
    });

    it('treats an omitted includeInactive and false as one key', async () => {
      const findAll = jest.spyOn(repository, 'findAll');

      await service.list({ limit: 10, offset: 0 });
      await service.list({ limit: 10, offset: 0, includeInactive: false });

      expect(findAll).toHaveBeenCalledTimes(1);
    });

    it('evicts the list cache when a product is created', async () => {
      await service.list({ limit: 10, offset: 0 });

      await service.create(validInput);
      const products = await service.list({ limit: 10, offset: 0 });

      expect(products).toHaveLength(1);
    });

    it('evicts the list cache when a product is updated', async () => {
      const created = await service.create(validInput);
      await service.list({ limit: 10, offset: 0 });

      await service.update(created.id, { priceSatang: 199000 });
      const products = await service.list({ limit: 10, offset: 0 });

      expect(products[0]?.priceSatang).toBe(199000);
    });

    it('evicts the list cache when a product is removed', async () => {
      const created = await service.create(validInput);
      await service.list({ limit: 10, offset: 0 });

      await service.remove(created.id);
      const products = await service.list({ limit: 10, offset: 0 });

      expect(products).toHaveLength(0);
    });

    it('does not evict when a write fails', async () => {
      await service.create(validInput);
      await service.list({ limit: 10, offset: 0 });
      const findAll = jest.spyOn(repository, 'findAll');

      await expect(
        service.update('missing-id', { priceSatang: 1 }),
      ).rejects.toThrow(NotFoundError);
      await service.list({ limit: 10, offset: 0 });

      expect(findAll).not.toHaveBeenCalled();
    });
  });
});


