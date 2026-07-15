#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, token};
use soroban_sdk::testutils::Address as _;

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    // Register our contract
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    // Create test addresses using generator
    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // Register a mock token (representing XLM SAC)
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_client = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);



    // Mint some initial balance to sender
    token_admin_client.mint(&from, &1000);
    assert_eq!(token_client.balance(&from), 1000);
    assert_eq!(token_client.balance(&to), 0);

    // Verify initial count is 0
    assert_eq!(client.get_payment_count(), 0);
    assert_eq!(client.get_total_volume(), 0);

    // Perform payment transfer through contract
    client.transfer(&token_address, &from, &to, &600);

    // Verify balances
    assert_eq!(token_client.balance(&from), 400);
    assert_eq!(token_client.balance(&to), 600);

    // Verify state changes
    assert_eq!(client.get_payment_count(), 1);
    assert_eq!(client.get_total_volume(), 600);
}

