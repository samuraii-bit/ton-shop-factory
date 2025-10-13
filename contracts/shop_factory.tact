import "@stdlib/ownable";
import "./messages";
import "./shop";
// Since v1.6.0, Tact has a contract parameters syntax that can supersede
// lazy initialization by init() for all contracts that do not require specific on-chain
// deployment logic that must be run only once in the `init()` function.
//
// Note that the empty parameter list above is still a parameter list,
// meaning that the contract won't have an implicit or explicit `init(){:tact}` function
// and will enjoy storage write optimizations and use less gas overall.
//
// See: https://docs.tact-lang.org/book/contracts/#parameters

contract ShopFactory with Ownable {
    // state
    owner: Address;
    // shops: Map<Int, Address>   // id -> shop address
    shopsCount: Int as uint256;

    // constructor
    init (owner: Address) {
        self.owner = owner;
        self.shopsCount = 0;
    }

    receive(msg: CreateShop) {
        let init: StateInit = initOf Shop(myAddress(), sender(), msg.shopName, self.shopsCount);

        send(SendParameters {
            to: contractAddress(init),
            value: ton("0.02"),
            mode: SendIgnoreErrors,
            code: init.code,
            data: init.data
        });
    
        let reply: StringBuilder = beginString();
        reply.append("Shop #");
        reply.append(self.shopsCount.toString());
        reply.append(" created");
        self.reply(reply.toString().asComment());

        self.shopsCount += 1;
    }

    // create a shop for caller(or specify owner)
    //   public func create_shop(owner_addr: Address) -> Address {
    //     // deploy new Shop contract with owner = owner_addr
    //     let shop_addr = deploy Shop(owner_addr, factory_address = SELF);
    //     shopCount += 1;
    //     shops[shopCount] = shop_addr;
    //     // emit event OrderCreated(shop_addr, owner_addr)
    //     return shop_addr;
    //   }

    // optionally: fee for shop creation
    // public func set_creation_fee(fee: Coins) { require(msg.sender == owner); creation_fee = fee; }
}
