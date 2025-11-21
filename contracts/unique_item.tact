import "@stdlib/ownable";
import "./messages";
import "./order";

// =============================
// STRICT TEP-62 NFT ITEM
// + your original logic (shop, price, string content)
// =============================

contract UniqueItem with Ownable {
    // ============ STANDARD NFT FIELDS ============
    deployed: Bool = false;
    collection: Address; // MUST exist for strict TEP-62
    owner: Address;
    index: Int as uint256;
    content: Cell; // standard NFT only accepts Cell

    // ============ YOUR FIELDS ============
    shop: Address;
    price: Int as coins = 0;
    priceSetted: Bool = false;

    init(collection: Address, shop: Address, index: Int, content: String) {
        self.collection = collection;
        self.owner = collection; // standard requires initial owner = collection
        self.index = index;
        self.shop = shop;

        // convert string → cell
        self.content = content.asSlice().asCell();
    }

    // ============ STRICT NFT DEPLOY ============
    receive(msg: NftItemDeploy) {
        require(!self.deployed, "Already deployed");
        require(sender() == self.collection, "Only collection can deploy");
        require(msg.index == self.index, "Wrong index");

        self.owner = msg.owner;
        self.content = msg.content;
        self.deployed = true;

        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance,
            body: NftExcesses{ query_id: msg.query_id }.toCell()
        });
    }

    // ============ STRICT NFT TRANSFER ============
    receive(msg: NftTransfer) {
        let ctx: Context = context();
        require(self.deployed, "Not deployed");
        require(ctx.sender == self.owner, "Not owner");

        // gas logic simplified but compatible
        let required: Int = ton("0.03") + msg.forward_amount;
        require(ctx.value >= required, "Low value");

        // forward exit message
        if (msg.forward_amount > 0) {
            send(SendParameters{
                to: msg.new_owner,
                value: msg.forward_amount,
                mode: SendPayGasSeparately,
                body: NftOwnershipAssigned{
                    query_id: msg.query_id,
                    prev_owner: self.owner,
                    forward_payload: msg.forward_payload
                }.toCell()
            });
        }

        // update owner (strict NFT rule: AFTER forward)
        self.owner = msg.new_owner;

        // send excess
        let excess: Int = ctx.value - required;
        if (excess > 0) {
            send(SendParameters{
                to: msg.response_destination,
                value: excess,
                body: NftExcesses{ query_id: msg.query_id }.toCell()
            });
        }
    }

    // ============ STATIC DATA (STRICT) ============
    receive(msg: NftGetStaticData) {
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue,
            body: NftReportStaticData{
                query_id: msg.query_id,
                index: self.index,
                collection: self.collection
            }.toCell()
        });
    }

    // ============ GET NFT DATA ============
    get fun get_nft_data(): NftData {
        return NftData{
            deployed: self.deployed,
            index: self.index,
            collection: self.collection,
            owner: self.owner,
            content: self.content
        };
    }

    // ======================================
    // YOUR ORIGINAL LOGIC (UNTOUCHED)
    // ======================================

    receive(msg: GetPriceUnique) {
        require(self.priceSetted, "Price not set");
        send(SendParameters{
            to: sender(),
            value: ton("0.1"),
            mode: SendIgnoreErrors,
            body: GetPriceResponseUnique{ price: self.price }.toCell()
        });
    }

    receive(msg: SetPrice) {
        self.requireOwner();
        self.price = msg.newPrice;
        self.priceSetted = true;
        self.reply("Price set".asComment());
    }

    receive() {
        cashback(sender());
    }

    // getters
    get fun price(): Int { return self.price; }
    get fun contentString(): String { return self.content.asSlice().asString(); }
    get fun isPriceSet(): Bool { return self.priceSetted; }
    get fun index(): Int { return self.index;}
    get fun content(): Cell { return self.content;}
}
