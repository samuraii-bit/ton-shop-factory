struct List {
    head: Cell;
}

// Standard NFT structures
struct NftData {
    deployed: Bool;
    index: Int;
    collection: Address;
    owner: Address;
    content: Cell;
}
