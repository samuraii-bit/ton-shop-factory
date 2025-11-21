import "@stdlib/ownable";
import "./messages";
import "./shop";

contract ShopFactory with Ownable {
    owner: Address;
    shopsCount: Int as uint256;

    // constructor
    init (owner: Address) {
        self.owner = owner;
        self.shopsCount = 0;
    }

    receive() {
    }

    receive(msg: CreateShop) {
        let init: StateInit = initOf Shop(myAddress(), self.shopsCount);

        send(SendParameters {
            to: contractAddress(init),
            value: ton("0.02"),
            mode: SendRemainingValue,
            code: init.code,
            data: init.data,
            body: ShopDeploy {shopName: msg.shopName, shopOwner: sender()}.toCell()
        });
    
        let reply: StringBuilder = beginString();
        reply.append("Shop #");
        reply.append(self.shopsCount.toString());
        reply.append(" created");
        self.reply(reply.toString().asComment());

        self.shopsCount += 1;
        cashback(sender());
    }

    get fun shopAddress(index: Int): Address {
        let init: StateInit = initOf Shop(myAddress(),index);
        return contractAddress(init);
    }

    get fun shopsCount(): Int {
        return self.shopsCount;
    }
}
