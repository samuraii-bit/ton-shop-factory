import "@stdlib/ownable";

// Since v1.6.0, Tact has a contract parameters syntax that can supersede
// lazy initialization by init() for all contracts that do not require specific on-chain
// deployment logic that must be run only once in the `init()` function.
//
// Note that the empty parameter list above is still a parameter list,
// meaning that the contract won't have an implicit or explicit `init(){:tact}` function
// and will enjoy storage write optimizations and use less gas overall.
//
// See: https://docs.tact-lang.org/book/contracts/#parameters
import "./messages";
import "./item";

contract Shop with Ownable {
    // Empty receiver for the deployment,
    // which expects the `null` message body
    parent: Address;
    owner: Address;
    shopName: String;
    itemsCount: Int as uint256;
    shopId: Int as uint256;

    init(parent: Address, owner: Address, shopName: String, shopId: Int) {
        self.parent = parent;
        self.owner = owner;
        self.shopName = shopName;
        self.shopId = shopId;
        self.itemsCount = 0;
    }

    receive(msg: AddItem) {
        self.requireOwner();

        let init: StateInit = initOf Item(myAddress(), myAddress(), msg.itemName, self.itemsCount);
        send(SendParameters {
            to: contractAddress(init),
            value: context().value,
            code: init.code,
            data: init.data
        }); 

        self.itemsCount += 1;
    }
    
    // receive() {
    //     // Forward the remaining value in the
    //     // incoming message back to the sender
    //     cashback(sender());
    // }
}
