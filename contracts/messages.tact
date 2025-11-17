message CreateShop {
    shopName: String;    
}

message AddItem {
    isUnique: Bool;
    price: Int as coins;
}

message NftTransfer {
    newOwner: Address;
    // isSalable: Bool;
}

message CreateOrderProductlineItems {
    itemsInfo: Cell;
}

message SetPrice {
    newPrice: Int as coins;
    // isSalable: Bool;
}

message SetUniqueItemPrice {
    uniqueItem: Address;
    newPrice: Int as coins;
}

message SetPlItemPrice {
    plItem: Address;
    newPrice: Int as coins;
}

message GetPricePl {
    quantity: Int as uint256;
}

message GetPriceUnique {
    // receiver: Address;
}

message GetPriceResponseUnique {
    price: Int as coins;
    // itemAddress: Address;
}

message GetPriceResponsePl {
    price: Int as coins;
    quantity: Int as int256;
}

message OrderCompleted {
    orderIndex: Int;
    buyer: Address;
}

message CreateOrderDeploy {
    itemsInfoUnique: Cell;
    itemsInfoPl: Cell;
    uniqueItemsCount: Int;
    buyer: Address;
}

message Pay{
    // uniqueItemsInfo: Cell;
}

message OrderCanceled {
    orderIndex: Int;
}

message CreateOrder {
    itemsInfoUnique: Cell;
    itemsInfoPl: Cell;
    // uIAddress: Address;
}

message ShopDeploy {
    shopName: String;
    shopOwner: Address;
}

message CreateList {
    listInfo: Cell;
}
