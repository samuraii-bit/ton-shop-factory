import "@stdlib/ownable";
import "./messages";
import "./order";

contract UniqueItem with Ownable {
    shop: Address;
    owner: Address;
    content: String; // prev itemName
    index: Int as uint256;
    price: Int as coins = 0;
    // isSalable: Bool = false;
    priceSetted: Bool = false;

    init(owner: Address, shop: Address, index: Int, content: String) {
        self.shop = shop;
        self.owner = owner;
        self.content = content;
        self.index = index;
    }

    receive (msg: GetPriceUnique)  {
        // require(self.isSalable, "Item not salable yet");
        require(self.priceSetted, "Item price not setted yet");
        send(SendParameters {
            to: sender(),
            value: ton("0.1"),
            mode: SendIgnoreErrors,
            body: GetPriceResponseUnique {price: self.price}.toCell()
        });
        cashback(sender());
    }

    receive(msg: SetPrice) {
        self.requireOwner();
        self.price = msg.newPrice;
        // self.isSalable = msg.isSalable;
        self.priceSetted = true;
        self.reply("Price setted".asComment());
    }

    receive(msg: NftTransfer) {
        self.requireOwner();
        self.owner = msg.newOwner;
        // self.isSalable = msg.isSalable;
        self.reply("UniqueItem transfered".asComment());
    }

    receive() {
        // Forward the remaining value in the
        // incoming message back to the sender
        cashback(sender());
    }

    get fun price(): Int {
        require(self.priceSetted, "Price not setted yet");
        return self.price;
    }

    get fun index(): Int {
        return self.index;
    }

    get fun content(): String {
        return self.content;
    }

    get fun priceSetted(): Bool {
        return self.priceSetted;
    }
}
