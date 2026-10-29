import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createProductSchema } from '../../src/modules/products/products.schema.js';
import { createReceivingSchema,receiptSchema } from '../../src/modules/receivings/receivings.schema.js';
import { mapBalance } from '../../src/modules/inventory/inventory.mapper.js';

describe('assessment domain boundary review',()=>{
 it('enforces normalized SKU and Unicode product name bounds',()=>{
  expect(createProductSchema.parse({sku:' a_1- ',name:' Name '})).toEqual({sku:'A_1-',name:'Name'});
  for(const sku of ['', 'A'.repeat(41),'A B','A%'])expect(createProductSchema.safeParse({sku,name:'Name'}).success).toBe(false);
  for(const sku of ['A','A'.repeat(40)])expect(createProductSchema.safeParse({sku,name:'\u{1f600}'.repeat(120)}).success).toBe(true);
  for(const name of ['', '  ','\u{1f600}'.repeat(121)])expect(createProductSchema.safeParse({sku:'A',name}).success).toBe(false);
 });
 it('accepts exactly 1 through 50 distinct receiving products and bounded integer expected quantities',()=>{
  const entries=Array.from({length:51},()=>({productId:randomUUID(),expectedQuantity:1000000}));
  for(const length of [1,50])expect(createReceivingSchema.safeParse({items:entries.slice(0,length)}).success).toBe(true);
  for(const length of [0,51])expect(createReceivingSchema.safeParse({items:entries.slice(0,length)}).success).toBe(false);
  for(const expectedQuantity of [0,-1,1.5,1000001,'1'])expect(createReceivingSchema.safeParse({items:[{productId:randomUUID(),expectedQuantity}]}).success).toBe(false);
  expect(createReceivingSchema.parse({items:[{productId:randomUUID(),expectedQuantity:1}]}).reference).toBe('');
 });
 it('enforces receipt array and quantity limits with canonical UUID uniqueness',()=>{
  const entries=Array.from({length:51},()=>({receivingItemId:randomUUID(),quantity:1000000}));
  expect(receiptSchema.safeParse({items:entries.slice(0,50)}).success).toBe(true);
  expect(receiptSchema.safeParse({items:entries}).success).toBe(false);
  expect(receiptSchema.safeParse({items:[]}).success).toBe(false);
  const id=randomUUID();expect(receiptSchema.safeParse({items:[{receivingItemId:id,quantity:1},{receivingItemId:id.toUpperCase(),quantity:2}]}).success).toBe(false);
 });
 it('serializes bigint balances above the JavaScript safe integer without loss',()=>{
  const id=randomUUID();const now=new Date();
  const result=mapBalance({productId:id,availableQuantity:9007199254740993n,updatedAt:now,product:{id,sku:'A',name:'Product',unit:'pcs',createdAt:now}});
  expect(result.availableQuantity).toBe('9007199254740993');expect(Object.keys(result).sort()).toEqual(['productId','sku','productName','unit','availableQuantity','updatedAt'].sort());
 });
});
