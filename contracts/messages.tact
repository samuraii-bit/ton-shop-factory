message CreateShop {
    shopName: String;    
}

message AddItem {
    isUnique: Bool;
    price: Int as coins;
}

// message NftTransfer {
//     newOwner: Address;
//     // isSalable: Bool;
// }

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

// standard messages
message(0x5fcc3d14) NftTransfer {
    query_id: Int as uint64;
    new_owner: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_amount: Int as coins;
    forward_payload: Slice as remaining;
}

message(0x05138d91) NftOwnershipAssigned {
    query_id: Int as uint64;
    prev_owner: Address;
    forward_payload: Slice as remaining;
}

message(0x6f89f5e3) NftExcesses {
    query_id: Int as uint64;
}

message(0x2fcb26a2) NftGetStaticData {
    query_id: Int as uint64;
}

message(0x8b771735) NftReportStaticData {
    query_id: Int as uint64;
    index: Int as uint256;
    collection: Address;
}

// collection → item deploy
message(0x5f96407c) NftItemDeploy {
    query_id: Int as uint64;
    index: Int as uint256;
    owner: Address;
    content: Cell;
}
