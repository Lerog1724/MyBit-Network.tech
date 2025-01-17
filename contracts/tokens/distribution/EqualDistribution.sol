pragma solidity 0.4.24;

import '../../math/SafeMath.sol';
import '../../interfaces/PullPayment.sol';

// @title A contract made to equally distribute payments amongs a list of beneficiaries
// @author Kyle Dewhurst & Peter Phillips MyBit Foundation
// @notice This contract allows someone to leave ETH for a beneficiary
// @dev assumes each beneficiary receives equal amount
contract EqualDistribution {
  using SafeMath for uint;

  address[] public beneficiaries;             // List of chosen beneficiaries

  uint public totalReleased;               // Total WEI so far released to beneficiaries

  mapping (address => uint) public amountRedeemed;    // Amount of WEI this address has already withdrawn from contract


  // @notice constructor. Sets the beneficiaries and where the income to be distributed is coming from
  // @param (address) _beneficiary = The ETH address of who is to receive the income. Could be a distribution contract.
  constructor(address[] _beneficiaries)
  public{
    require(_beneficiaries.length < 200); 
    beneficiaries = _beneficiaries;
  }

  // @notice allows beneficiaries to withdraw from contracts at different locations to be re-distributed here
  // @dev can call withdraw() on any address if there are no parameters required. Fallback function will be triggered
  // @param (address) _contractAddress = The address to call withdraw() on.
  function getFunds(address _contractAddress)
  external
  returns (bool) {
    PullPayment(_contractAddress).withdraw();
    return true;
  }

  // @notice beneficiaries can withdraw their share of the income here
  function withdraw()
  external
  returns (bool) {
    uint amount = ((address(this).balance.add(totalReleased)).div(beneficiaries.length)).sub(amountRedeemed[msg.sender]);
    amountRedeemed[msg.sender] = amountRedeemed[msg.sender].add(amount);
    totalReleased = totalReleased.add(amount);
    msg.sender.transfer(amount);
    emit LogWithdraw(msg.sender, amount);
    return true;
  }

  // @notice fallback function. Accepts Ether and updates income balance
  function ()
  public
  payable {
    emit LogPayment(msg.sender, msg.value);
  }


  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Constants
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // @notice check if the address is one of the beneficiaries
  function isBeneficiary(address _beneficiary)
  public
  view
  returns (bool) {
    for (uint i = 0; i < beneficiaries.length; i++){
      if (beneficiaries[i] == _beneficiary) { return true; }
    }
    return false;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Events
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  event LogPayment(address _sender, uint _amount);
  event LogWithdraw(address _beneficiary, uint _amount);

}
