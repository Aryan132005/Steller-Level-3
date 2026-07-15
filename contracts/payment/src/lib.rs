#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol, token};

const COUNTER: Symbol = symbol_short!("COUNTER");
const VOLUME: Symbol = symbol_short!("VOLUME");

#[contract]
pub struct PaymentContract;

#[contractimpl]
impl PaymentContract {
    pub fn transfer(env: Env, token_address: Address, from: Address, to: Address, amount: i128) {
        // 1. Authorize the sender
        from.require_auth();

        // 2. Create a client for the token contract (SAC)
        let token_client = token::Client::new(&env, &token_address);

        // 3. Perform the transfer
        token_client.transfer(&from, &to, &amount);

        // 4. Update the state counter
        let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&COUNTER, &count);

        // 5. Update the total volume
        let mut volume: i128 = env.storage().instance().get(&VOLUME).unwrap_or(0);
        volume += amount;
        env.storage().instance().set(&VOLUME, &volume);
    }

    pub fn get_payment_count(env: Env) -> u32 {
        env.storage().instance().get(&COUNTER).unwrap_or(0)
    }

    pub fn get_total_volume(env: Env) -> i128 {
        env.storage().instance().get(&VOLUME).unwrap_or(0)
    }
}

mod test;

