import "@stdlib/ownable";
import "./messages";

contract ProductLineItem with Ownable {
    owner: Address;
    shop: Address;
    content: String;
    index: Int as uint256;
    price: Int as coins = 0;
    priceSetted: Bool = false;

    init(owner: Address, shop: Address, content: String, index: Int) {
        self.owner = owner;
        self.shop = shop;
        self.content = content;
        self.index = index;
        // self.price = price;
    }

    receive(msg: GetPricePl) {
        require(self.priceSetted, "Price not setted yet");
        let price: Int = self.price * msg.quantity;
        send(SendParameters {
            to: sender(),
            value: ton("0.1"),
            mode: SendIgnoreErrors,
            body: GetPriceResponsePl{price: price, quantity: msg.quantity}.toCell()
        });
    }

    receive(msg: SetPrice) {
        self.requireOwner();
        self.price = msg.newPrice;
        self.priceSetted = true;
        self.reply("Price setted".asComment());
        cashback(sender());
    }

    // Empty receiver for the deployment,
    // which expects the `null` message body
    receive() {
        // Forward the remaining value in the
        // incoming message back to the sender
        cashback(sender());
    }

    get fun price(): Int {
        return self.price;
    }
}
