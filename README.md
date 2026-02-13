# 🏪 TON Marketplace Factory (Tact)

A fully on-chain **Marketplace Factory** written in **Tact**.  
It allows deploying independent shops that support:

- Physical offline items  
- Digital items  
- Fully TEP-62 compatible NFTs  
- Mixed orders (NFT + product-line items)  
- Automatic price aggregation  
- Automated NFT transfers during checkout  

This repository contains the complete smart-contract architecture for a modular, extensible marketplace system on **TON**.

---

## ✨ Features

### 🏭 ShopFactory
- Deploys new `Shop` contracts  
- Assigns a unique `shopId` to each shop  
- Returns shop addresses deterministically  
- Replies to the creator with deployment status  
- Stores total amount of created shops  

### 🏬 Shop Contract
Each shop acts as an independent marketplace:

#### Adding Items
- **UniqueItem (NFT, TEP-62 strict)**
  - Unique content per item
  - NFT deployed via `NftItemDeploy`
  - Full TEP-62 transfer semantics
  - Price stored on-chain via a separate `SetPrice` call

- **ProductLineItem (Non-NFT)**
  - Standard goods with quantities
  - Independent price for each item type
  - Simplified item deployment

#### Order System
A buyer can create an on-chain order that includes:
- Any number of NFT items  
- Any number of product-line items  

The order contract:
- Requests prices from all items
- Aggregates total expected price
- Verifies item list consistency
- Accepts payment
- Transfers all NFTs to the buyer
- Pays the seller
- Emits `OrderCompleted` or `OrderCanceled`

#### Price Control (Owner Only)
- Update price of any unique item
- Update price of any product-line item

#### Metadata
- TEP-62 `get_collection_data`
- NFT address computation
- Getter for counts: items, orders, PL items

---

## 🧩 Contract Overview

### ShopFactory
#### &emsp; └── Shop
#### &emsp; ├── UniqueItem (TEP-62 NFT)
#### &emsp; ├── ProductLineItem (PL item with quantity)
#### &emsp; └── Order (aggregates items, pricing, payments)
---

## 📦 ShopFactory: Key Methods

### `receive(CreateShop)`
Deploys a new `Shop` contract using deterministic `StateInit`.

### `get shopAddress(index)`
Returns address of a shop by index.

### `get shopsCount()`
Returns total number of deployed shops.

---

## 🏬 Shop: Key Logic

### Item Deployment
- `receive(AddItem)` deploys either:
  - A `UniqueItem`
  - A `ProductLineItem`
- Each item receives a deterministic address based on:
  - `collection` (shop address)
  - `shop` (shop address)
  - `index`
  - `content` (URL or metadata)

### Order Creation
`receive(CreateOrder)`:
- Validates lists of items  
- Transfers NFTs into Order contract  
- Deploys the Order  
- Sends confirmation messages  

### Price Handling
- `receive(SetUniqueItemPrice)`
- `receive(SetPlItemPrice)`
Both update prices via internal `SetPrice`.

---

## 🧱 UniqueItem (TEP-62)

Implements strict NFT flow:

- `NftItemDeploy`
- `NftTransfer`
- `NftGetStaticData`
- Owner tracking  
- Content stored in a `Cell`  
- Custom fields:
  - `price`
  - `priceSetted`
  - `shop` reference

Compatible with:<br>
- NftData { <br>
&emsp;&emsp;deployed: Bool,<br>
&emsp;&emsp;index: Int,<br>
&emsp;&emsp;collection: Address,<br>
&emsp;&emsp;owner: Address,<br>
&emsp;&emsp;content: Cell<br>
}

### Project Files

#### /contracts<br>
&emsp;├── shop_factory.tact<br>
&emsp;├── shop.tact<br>
&emsp;├── unique_item.tact<br>
&emsp;├── product_line_item.tact<br>
&emsp;├── order.tact<br>
&emsp;├── messages.tact<br>
&emsp;└── structs.tact<br>


---

## Deployment Flow

1. Deploy **ShopFactory**  
2. Call `create_shop`  
3. Receive the address of the deployed `Shop`  
4. Add items to the shop  
5. Buyer creates an order and attaches payment  
6. Shop processes the order and performs transfers  

---

## Tech Stack

- Tact  
- TON Blockchain  
- TEP-62 NFT Standard  
- Fully on-chain marketplace logic  

---
