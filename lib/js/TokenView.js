"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var TokenView = exports.TokenView = 
{
  "contractName": "TokenView",
  "abi": [
    {
      "constant": true,
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_tokenHolder",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ],
  "bytecode": "0x",
  "deployedBytecode": "0x",
  "sourceMap": "",
  "deployedSourceMap": "",
  "source": "pragma solidity 0.4.24;\n\nimport \"../math/SafeMath.sol\";\ninterface Burner { function burnEscrow(bytes32 _assetID) external returns (bool); }\ninterface Escrow { function unlockEscrow(bytes32 _assetID) external returns (bool); }\ninterface DB {\n  function addressStorage(bytes32 _key) external  view returns (address);\n  function uintStorage(bytes32 _key) external view returns (uint);\n  function setUint(bytes32 _key, uint _value) external;\n}\ninterface TokenView {\n  function totalSupply() external view returns (uint);\n  function balanceOf(address _tokenHolder) external view returns (uint);\n}\n\n// @title A contract to manage the governance of assets on the platform\n// @author Kyle Dewhurst, MyBit Foundation\n// @notice All token holders of an asset can vote here\ncontract AssetGovernance {\n  using SafeMath for uint256;\n\n  DB public database;\n\n\n  constructor(address _database)\n  public {\n    database = DB(_database);\n  }\n\n\n  // @param (bytes32) _parameterHash = The hash of the exact parameter to be called for function...\n  // @dev ie sha3(_assetID) or sha3(_assetID, someAddress)\n  function voteForExecution(address _executingContract, bytes32 _assetID, bytes4 _methodID, bytes32 _parameterHash, uint _amountToLock)\n  external\n  validAsset(_assetID)\n  returns (bool) {\n    bytes32 executionID = keccak256(abi.encodePacked(_executingContract, _assetID, _methodID, _parameterHash));\n    bytes32 numVotesID = keccak256(abi.encodePacked(\"voteTotal\", executionID));\n    bytes32 investorVotesID = keccak256(abi.encodePacked(\"investorVotes\", executionID, msg.sender));\n    uint256 numVotes = database.uintStorage(numVotesID);\n    uint256 investorVotes = database.uintStorage(investorVotesID);\n    require(lockTokens(_assetID, msg.sender, _amountToLock));\n    database.setUint(numVotesID, numVotes.add(_amountToLock));\n    database.setUint(investorVotesID, investorVotes.add(_amountToLock));\n    return true;\n  }\n\n\n  // @notice unlock tokens, removing them from the vote\n  // @dev _executionID should be looked up in event logs. it is equal to sha3(_assetID, _methodID, _parameterHash)\n  function unlockToken(address _executingContract, bytes32 _assetID, bytes4 _methodID, bytes32 _parameterHash, uint _amountToUnlock)\n  external\n  validAsset(_assetID)\n  returns (bool) {\n    bytes32 executionID = keccak256(abi.encodePacked(_executingContract, _assetID, _methodID, _parameterHash));\n    bytes32 voteTotalID = keccak256(abi.encodePacked(\"voteTotal\", executionID));\n    bytes32 investorVotesID = keccak256(abi.encodePacked(\"investorVotes\", executionID));\n    uint investorVotes = database.uintStorage(investorVotesID);\n    uint totalVotes = database.uintStorage(voteTotalID);\n    require(investorVotes <= _amountToUnlock);   // 1 vote = 1 token\n    database.setUint(voteTotalID, totalVotes.sub(_amountToUnlock));\n    database.setUint(investorVotesID, investorVotes.sub(_amountToUnlock));\n    return true;\n  }\n\n  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n  //                                            Public Functions\n  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n\n  // @notice  Checks that 1/3 or more of token holders agreed on function call\n  function isConsensusReached(address _executingContract, bytes32 _assetID, bytes4 _methodID, bytes32 _parameterHash)\n  public\n  view\n  returns (bool) {\n    TokenView assetToken = TokenView(database.addressStorage(keccak256(abi.encodePacked(\"tokenAddress\", _assetID))));\n    bytes32 executionID = keccak256(abi.encodePacked(_executingContract, _assetID, _methodID, _parameterHash));\n    bytes32 numVotesID = keccak256(abi.encodePacked(\"voteTotal\", executionID));\n    uint256 numTokens = assetToken.totalSupply();\n    return database.uintStorage(numVotesID).mul(100).div(numTokens) >= 33;\n  }\n\n\n  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n  //                                            Internal Functions\n  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n\n  // @notice lock asset tokens to be able to vote\n  // @dev keeps track of how many assetTokens this investor has locked (for GovernedToken checks)\n  function lockTokens(bytes32 _assetID, address _investor, uint _amount)\n  internal\n  returns (bool) {\n    TokenView assetToken = TokenView(database.addressStorage(keccak256(abi.encodePacked(\"tokenAddress\", _assetID))));\n    uint numTokensLocked = database.uintStorage(keccak256(abi.encodePacked(\"tokensLocked\", _assetID, _investor)));\n    require(_amount <= assetToken.balanceOf(_investor).sub(numTokensLocked));\n    database.setUint(keccak256(abi.encodePacked(\"tokensLocked\", _assetID, _investor)), numTokensLocked.add(_amount));\n    return true;\n  }\n\n\n  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n  //                                            Modifiers\n  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////\n\n  // @notice add this modifer to functions that you want multi-sig requirements for\n  // @dev function can only be called after at least n >= quorumLevel owners have agreed to call it\n  modifier hasConsensus(bytes32 _assetID, bytes4 _methodID, bytes32 _parameterHash) {\n    require(isConsensusReached(address(this), _assetID, _methodID, _parameterHash));   // owners must have agreed on function + parameters\n    _;\n  }\n\n  // @notice reverts if the asset does not have a token address set in the database\n  modifier validAsset(bytes32 _assetID) {\n    require(database.addressStorage(keccak256(abi.encodePacked(\"tokenAddress\", _assetID))) != address(0));\n    _;\n  }\n\n}\n",
  "sourcePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/ownership/AssetGovernance.sol",
  "ast": {
    "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/ownership/AssetGovernance.sol",
    "exportedSymbols": {
      "AssetGovernance": [
        7382
      ],
      "Burner": [
        6944
      ],
      "DB": [
        6974
      ],
      "Escrow": [
        6952
      ],
      "TokenView": [
        6987
      ]
    },
    "id": 7383,
    "nodeType": "SourceUnit",
    "nodes": [
      {
        "id": 6935,
        "literals": [
          "solidity",
          "0.4",
          ".24"
        ],
        "nodeType": "PragmaDirective",
        "src": "0:23:30"
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/math/SafeMath.sol",
        "file": "../math/SafeMath.sol",
        "id": 6936,
        "nodeType": "ImportDirective",
        "scope": 7383,
        "sourceUnit": 6934,
        "src": "25:30:30",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6944,
        "linearizedBaseContracts": [
          6944
        ],
        "name": "Burner",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6943,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "burnEscrow",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6939,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6938,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 6943,
                  "src": "95:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6937,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "95:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "94:18:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6942,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6941,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6943,
                  "src": "131:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6940,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "131:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "130:6:30"
            },
            "scope": 6944,
            "src": "75:62:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "56:83:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6952,
        "linearizedBaseContracts": [
          6952
        ],
        "name": "Escrow",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6951,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "unlockEscrow",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6947,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6946,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 6951,
                  "src": "181:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6945,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "181:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "180:18:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6950,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6949,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6951,
                  "src": "217:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6948,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "217:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "216:6:30"
            },
            "scope": 6952,
            "src": "159:64:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "140:85:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6974,
        "linearizedBaseContracts": [
          6974
        ],
        "name": "DB",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6959,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "addressStorage",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6955,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6954,
                  "name": "_key",
                  "nodeType": "VariableDeclaration",
                  "scope": 6959,
                  "src": "267:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6953,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "267:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "266:14:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6958,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6957,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6959,
                  "src": "305:7:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6956,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "305:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "304:9:30"
            },
            "scope": 6974,
            "src": "243:71:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6966,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "uintStorage",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6962,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6961,
                  "name": "_key",
                  "nodeType": "VariableDeclaration",
                  "scope": 6966,
                  "src": "338:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6960,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "338:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "337:14:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6965,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6964,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6966,
                  "src": "375:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6963,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "375:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "374:6:30"
            },
            "scope": 6974,
            "src": "317:64:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6973,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "setUint",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6971,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6968,
                  "name": "_key",
                  "nodeType": "VariableDeclaration",
                  "scope": 6973,
                  "src": "401:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6967,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "401:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 6970,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6973,
                  "src": "415:11:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6969,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "415:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "400:27:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6972,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "436:0:30"
            },
            "scope": 6974,
            "src": "384:53:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "226:213:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6987,
        "linearizedBaseContracts": [
          6987
        ],
        "name": "TokenView",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6979,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "totalSupply",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6975,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "484:2:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6978,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6977,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6979,
                  "src": "510:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6976,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "510:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "509:6:30"
            },
            "scope": 6987,
            "src": "464:52:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6986,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "balanceOf",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6982,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6981,
                  "name": "_tokenHolder",
                  "nodeType": "VariableDeclaration",
                  "scope": 6986,
                  "src": "538:20:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6980,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "538:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "537:22:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6985,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6984,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6986,
                  "src": "583:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6983,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "583:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "582:6:30"
            },
            "scope": 6987,
            "src": "519:70:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "440:151:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "contract",
        "documentation": null,
        "fullyImplemented": true,
        "id": 7382,
        "linearizedBaseContracts": [
          7382
        ],
        "name": "AssetGovernance",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "id": 6990,
            "libraryName": {
              "contractScope": null,
              "id": 6988,
              "name": "SafeMath",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6933,
              "src": "798:8:30",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_SafeMath_$6933",
                "typeString": "library SafeMath"
              }
            },
            "nodeType": "UsingForDirective",
            "src": "792:27:30",
            "typeName": {
              "id": 6989,
              "name": "uint256",
              "nodeType": "ElementaryTypeName",
              "src": "811:7:30",
              "typeDescriptions": {
                "typeIdentifier": "t_uint256",
                "typeString": "uint256"
              }
            }
          },
          {
            "constant": false,
            "id": 6992,
            "name": "database",
            "nodeType": "VariableDeclaration",
            "scope": 7382,
            "src": "823:18:30",
            "stateVariable": true,
            "storageLocation": "default",
            "typeDescriptions": {
              "typeIdentifier": "t_contract$_DB_$6974",
              "typeString": "contract DB"
            },
            "typeName": {
              "contractScope": null,
              "id": 6991,
              "name": "DB",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6974,
              "src": "823:2:30",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_DB_$6974",
                "typeString": "contract DB"
              }
            },
            "value": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 7003,
              "nodeType": "Block",
              "src": "887:35:30",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "id": 7001,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftHandSide": {
                      "argumentTypes": null,
                      "id": 6997,
                      "name": "database",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 6992,
                      "src": "893:8:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DB_$6974",
                        "typeString": "contract DB"
                      }
                    },
                    "nodeType": "Assignment",
                    "operator": "=",
                    "rightHandSide": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "id": 6999,
                          "name": "_database",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 6994,
                          "src": "907:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        ],
                        "id": 6998,
                        "name": "DB",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6974,
                        "src": "904:2:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_type$_t_contract$_DB_$6974_$",
                          "typeString": "type(contract DB)"
                        }
                      },
                      "id": 7000,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "typeConversion",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "904:13:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DB_$6974",
                        "typeString": "contract DB"
                      }
                    },
                    "src": "893:24:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_DB_$6974",
                      "typeString": "contract DB"
                    }
                  },
                  "id": 7002,
                  "nodeType": "ExpressionStatement",
                  "src": "893:24:30"
                }
              ]
            },
            "documentation": null,
            "id": 7004,
            "implemented": true,
            "isConstructor": true,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6995,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6994,
                  "name": "_database",
                  "nodeType": "VariableDeclaration",
                  "scope": 7004,
                  "src": "859:17:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6993,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "859:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "858:19:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6996,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "887:0:30"
            },
            "scope": 7382,
            "src": "847:75:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 7101,
              "nodeType": "Block",
              "src": "1271:637:30",
              "statements": [
                {
                  "assignments": [
                    7023
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7023,
                      "name": "executionID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1277:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7022,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "1277:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7033,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7027,
                            "name": "_executingContract",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7006,
                            "src": "1326:18:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7028,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7008,
                            "src": "1346:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7029,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7010,
                            "src": "1356:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7030,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7012,
                            "src": "1367:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7025,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "1309:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7026,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "1309:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7031,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1309:73:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7024,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "1299:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7032,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1299:84:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1277:106:30"
                },
                {
                  "assignments": [
                    7035
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7035,
                      "name": "numVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1389:18:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7034,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "1389:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7043,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "766f7465546f74616c",
                            "id": 7039,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1437:11:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            "value": "voteTotal"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7040,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7023,
                            "src": "1450:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7037,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "1420:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7038,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "1420:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7041,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1420:42:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7036,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "1410:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7042,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1410:53:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1389:74:30"
                },
                {
                  "assignments": [
                    7045
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7045,
                      "name": "investorVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1469:23:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7044,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "1469:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7055,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "696e766573746f72566f746573",
                            "id": 7049,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1522:15:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            "value": "investorVotes"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7050,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7023,
                            "src": "1539:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "id": 7051,
                              "name": "msg",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13268,
                              "src": "1552:3:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_magic_message",
                                "typeString": "msg"
                              }
                            },
                            "id": 7052,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "sender",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1552:10:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7047,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "1505:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7048,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "1505:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7053,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1505:58:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7046,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "1495:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7054,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1495:69:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1469:95:30"
                },
                {
                  "assignments": [
                    7057
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7057,
                      "name": "numVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1570:16:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7056,
                        "name": "uint256",
                        "nodeType": "ElementaryTypeName",
                        "src": "1570:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7062,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7060,
                        "name": "numVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7035,
                        "src": "1610:10:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7058,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1589:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7059,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "1589:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7061,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1589:32:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1570:51:30"
                },
                {
                  "assignments": [
                    7064
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7064,
                      "name": "investorVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1627:21:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7063,
                        "name": "uint256",
                        "nodeType": "ElementaryTypeName",
                        "src": "1627:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7069,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7067,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7045,
                        "src": "1672:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7065,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1651:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7066,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "1651:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7068,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1651:37:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1627:61:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7072,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7008,
                            "src": "1713:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "id": 7073,
                              "name": "msg",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13268,
                              "src": "1723:3:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_magic_message",
                                "typeString": "msg"
                              }
                            },
                            "id": 7074,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "sender",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1723:10:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7075,
                            "name": "_amountToLock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7014,
                            "src": "1735:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "id": 7071,
                          "name": "lockTokens",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7337,
                          "src": "1702:10:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_nonpayable$_t_bytes32_$_t_address_$_t_uint256_$returns$_t_bool_$",
                            "typeString": "function (bytes32,address,uint256) returns (bool)"
                          }
                        },
                        "id": 7076,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1702:47:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7070,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "1694:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7077,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1694:56:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7078,
                  "nodeType": "ExpressionStatement",
                  "src": "1694:56:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7082,
                        "name": "numVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7035,
                        "src": "1773:10:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7085,
                            "name": "_amountToLock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7014,
                            "src": "1798:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7083,
                            "name": "numVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7057,
                            "src": "1785:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7084,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "add",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6914,
                          "src": "1785:12:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7086,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1785:27:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7079,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1756:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7081,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "1756:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7087,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1756:57:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7088,
                  "nodeType": "ExpressionStatement",
                  "src": "1756:57:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7092,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7045,
                        "src": "1836:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7095,
                            "name": "_amountToLock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7014,
                            "src": "1871:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7093,
                            "name": "investorVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7064,
                            "src": "1853:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7094,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "add",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6914,
                          "src": "1853:17:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7096,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1853:32:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7089,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1819:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7091,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "1819:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7097,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1819:67:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7098,
                  "nodeType": "ExpressionStatement",
                  "src": "1819:67:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 7099,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "1899:4:30",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 7021,
                  "id": 7100,
                  "nodeType": "Return",
                  "src": "1892:11:30"
                }
              ]
            },
            "documentation": null,
            "id": 7102,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [
              {
                "arguments": [
                  {
                    "argumentTypes": null,
                    "id": 7017,
                    "name": "_assetID",
                    "nodeType": "Identifier",
                    "overloadedDeclarations": [],
                    "referencedDeclaration": 7008,
                    "src": "1244:8:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  }
                ],
                "id": 7018,
                "modifierName": {
                  "argumentTypes": null,
                  "id": 7016,
                  "name": "validAsset",
                  "nodeType": "Identifier",
                  "overloadedDeclarations": [],
                  "referencedDeclaration": 7381,
                  "src": "1233:10:30",
                  "typeDescriptions": {
                    "typeIdentifier": "t_modifier$_t_bytes32_$",
                    "typeString": "modifier (bytes32)"
                  }
                },
                "nodeType": "ModifierInvocation",
                "src": "1233:20:30"
              }
            ],
            "name": "voteForExecution",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7015,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7006,
                  "name": "_executingContract",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1112:26:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7005,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "1112:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7008,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1140:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7007,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "1140:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7010,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1158:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7009,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "1158:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7012,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1176:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7011,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "1176:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7014,
                  "name": "_amountToLock",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1200:18:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 7013,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "1200:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "1111:108:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7021,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7020,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1265:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7019,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "1265:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "1264:6:30"
            },
            "scope": 7382,
            "src": "1086:822:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 7194,
              "nodeType": "Block",
              "src": "2266:637:30",
              "statements": [
                {
                  "assignments": [
                    7121
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7121,
                      "name": "executionID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2272:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7120,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "2272:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7131,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7125,
                            "name": "_executingContract",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7104,
                            "src": "2321:18:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7126,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7106,
                            "src": "2341:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7127,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7108,
                            "src": "2351:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7128,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7110,
                            "src": "2362:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7123,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "2304:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7124,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2304:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7129,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2304:73:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7122,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "2294:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7130,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2294:84:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2272:106:30"
                },
                {
                  "assignments": [
                    7133
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7133,
                      "name": "voteTotalID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2384:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7132,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "2384:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7141,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "766f7465546f74616c",
                            "id": 7137,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "2433:11:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            "value": "voteTotal"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7138,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7121,
                            "src": "2446:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7135,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "2416:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7136,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2416:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7139,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2416:42:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7134,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "2406:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7140,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2406:53:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2384:75:30"
                },
                {
                  "assignments": [
                    7143
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7143,
                      "name": "investorVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2465:23:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7142,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "2465:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7151,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "696e766573746f72566f746573",
                            "id": 7147,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "2518:15:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            "value": "investorVotes"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7148,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7121,
                            "src": "2535:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7145,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "2501:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7146,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2501:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7149,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2501:46:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7144,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "2491:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7150,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2491:57:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2465:83:30"
                },
                {
                  "assignments": [
                    7153
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7153,
                      "name": "investorVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2554:18:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7152,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "2554:4:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7158,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7156,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7143,
                        "src": "2596:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7154,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2575:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7155,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "2575:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7157,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2575:37:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2554:58:30"
                },
                {
                  "assignments": [
                    7160
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7160,
                      "name": "totalVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2618:15:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7159,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "2618:4:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7165,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7163,
                        "name": "voteTotalID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7133,
                        "src": "2657:11:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7161,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2636:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7162,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "2636:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7164,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2636:33:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2618:51:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 7169,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "id": 7167,
                          "name": "investorVotes",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7153,
                          "src": "2683:13:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "id": 7168,
                          "name": "_amountToUnlock",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7112,
                          "src": "2700:15:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "src": "2683:32:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7166,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "2675:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7170,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2675:41:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7171,
                  "nodeType": "ExpressionStatement",
                  "src": "2675:41:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7175,
                        "name": "voteTotalID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7133,
                        "src": "2761:11:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7178,
                            "name": "_amountToUnlock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7112,
                            "src": "2789:15:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7176,
                            "name": "totalVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7160,
                            "src": "2774:10:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7177,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "sub",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6890,
                          "src": "2774:14:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7179,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2774:31:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7172,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2744:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7174,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "2744:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7180,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2744:62:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7181,
                  "nodeType": "ExpressionStatement",
                  "src": "2744:62:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7185,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7143,
                        "src": "2829:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7188,
                            "name": "_amountToUnlock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7112,
                            "src": "2864:15:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7186,
                            "name": "investorVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7153,
                            "src": "2846:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7187,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "sub",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6890,
                          "src": "2846:17:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7189,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2846:34:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7182,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2812:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7184,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "2812:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7190,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2812:69:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7191,
                  "nodeType": "ExpressionStatement",
                  "src": "2812:69:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 7192,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "2894:4:30",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 7119,
                  "id": 7193,
                  "nodeType": "Return",
                  "src": "2887:11:30"
                }
              ]
            },
            "documentation": null,
            "id": 7195,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [
              {
                "arguments": [
                  {
                    "argumentTypes": null,
                    "id": 7115,
                    "name": "_assetID",
                    "nodeType": "Identifier",
                    "overloadedDeclarations": [],
                    "referencedDeclaration": 7106,
                    "src": "2239:8:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  }
                ],
                "id": 7116,
                "modifierName": {
                  "argumentTypes": null,
                  "id": 7114,
                  "name": "validAsset",
                  "nodeType": "Identifier",
                  "overloadedDeclarations": [],
                  "referencedDeclaration": 7381,
                  "src": "2228:10:30",
                  "typeDescriptions": {
                    "typeIdentifier": "t_modifier$_t_bytes32_$",
                    "typeString": "modifier (bytes32)"
                  }
                },
                "nodeType": "ModifierInvocation",
                "src": "2228:20:30"
              }
            ],
            "name": "unlockToken",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7113,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7104,
                  "name": "_executingContract",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2105:26:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7103,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "2105:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7106,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2133:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7105,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "2133:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7108,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2151:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7107,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "2151:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7110,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2169:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7109,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "2169:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7112,
                  "name": "_amountToUnlock",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2193:20:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 7111,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "2193:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "2104:110:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7119,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7118,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2260:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7117,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "2260:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "2259:6:30"
            },
            "scope": 7382,
            "src": "2084:819:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 7264,
              "nodeType": "Block",
              "src": "3435:440:30",
              "statements": [
                {
                  "assignments": [
                    7209
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7209,
                      "name": "assetToken",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3441:20:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_TokenView_$6987",
                        "typeString": "contract TokenView"
                      },
                      "typeName": {
                        "contractScope": null,
                        "id": 7208,
                        "name": "TokenView",
                        "nodeType": "UserDefinedTypeName",
                        "referencedDeclaration": 6987,
                        "src": "3441:9:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_TokenView_$6987",
                          "typeString": "contract TokenView"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7222,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "746f6b656e41646472657373",
                                    "id": 7216,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "string",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "3525:14:30",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    "value": "tokenAddress"
                                  },
                                  {
                                    "argumentTypes": null,
                                    "id": 7217,
                                    "name": "_assetID",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 7199,
                                    "src": "3541:8:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 7214,
                                    "name": "abi",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13255,
                                    "src": "3508:3:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_abi",
                                      "typeString": "abi"
                                    }
                                  },
                                  "id": 7215,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "memberName": "encodePacked",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "3508:16:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                    "typeString": "function () pure returns (bytes memory)"
                                  }
                                },
                                "id": 7218,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "3508:42:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              ],
                              "id": 7213,
                              "name": "keccak256",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13262,
                              "src": "3498:9:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                "typeString": "function () pure returns (bytes32)"
                              }
                            },
                            "id": 7219,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "3498:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7211,
                            "name": "database",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 6992,
                            "src": "3474:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DB_$6974",
                              "typeString": "contract DB"
                            }
                          },
                          "id": 7212,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "addressStorage",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6959,
                          "src": "3474:23:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                            "typeString": "function (bytes32) view external returns (address)"
                          }
                        },
                        "id": 7220,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "3474:78:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "id": 7210,
                      "name": "TokenView",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 6987,
                      "src": "3464:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_contract$_TokenView_$6987_$",
                        "typeString": "type(contract TokenView)"
                      }
                    },
                    "id": 7221,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3464:89:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_TokenView_$6987",
                      "typeString": "contract TokenView"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3441:112:30"
                },
                {
                  "assignments": [
                    7224
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7224,
                      "name": "executionID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3559:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7223,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "3559:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7234,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7228,
                            "name": "_executingContract",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7197,
                            "src": "3608:18:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7229,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7199,
                            "src": "3628:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7230,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7201,
                            "src": "3638:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7231,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7203,
                            "src": "3649:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7226,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "3591:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7227,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3591:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7232,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "3591:73:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7225,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "3581:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7233,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3581:84:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3559:106:30"
                },
                {
                  "assignments": [
                    7236
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7236,
                      "name": "numVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3671:18:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7235,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "3671:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7244,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "766f7465546f74616c",
                            "id": 7240,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "3719:11:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            "value": "voteTotal"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7241,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7224,
                            "src": "3732:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7238,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "3702:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7239,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3702:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7242,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "3702:42:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7237,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "3692:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7243,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3692:53:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3671:74:30"
                },
                {
                  "assignments": [
                    7246
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7246,
                      "name": "numTokens",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3751:17:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7245,
                        "name": "uint256",
                        "nodeType": "ElementaryTypeName",
                        "src": "3751:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7250,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [],
                    "expression": {
                      "argumentTypes": [],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7247,
                        "name": "assetToken",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7209,
                        "src": "3771:10:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_TokenView_$6987",
                          "typeString": "contract TokenView"
                        }
                      },
                      "id": 7248,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "totalSupply",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6979,
                      "src": "3771:22:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$__$returns$_t_uint256_$",
                        "typeString": "function () view external returns (uint256)"
                      }
                    },
                    "id": 7249,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3771:24:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3751:44:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 7262,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "id": 7259,
                          "name": "numTokens",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7246,
                          "src": "3854:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        ],
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "hexValue": "313030",
                              "id": 7256,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "kind": "number",
                              "lValueRequested": false,
                              "nodeType": "Literal",
                              "src": "3845:3:30",
                              "subdenomination": null,
                              "typeDescriptions": {
                                "typeIdentifier": "t_rational_100_by_1",
                                "typeString": "int_const 100"
                              },
                              "value": "100"
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_rational_100_by_1",
                                "typeString": "int_const 100"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 7253,
                                  "name": "numVotesID",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 7236,
                                  "src": "3829:10:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 7251,
                                  "name": "database",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 6992,
                                  "src": "3808:8:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DB_$6974",
                                    "typeString": "contract DB"
                                  }
                                },
                                "id": 7252,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "uintStorage",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6966,
                                "src": "3808:20:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                                  "typeString": "function (bytes32) view external returns (uint256)"
                                }
                              },
                              "id": 7254,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3808:32:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 7255,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "mul",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6856,
                            "src": "3808:36:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 7257,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3808:41:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 7258,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "div",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": 6870,
                        "src": "3808:45:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                          "typeString": "function (uint256,uint256) pure returns (uint256)"
                        }
                      },
                      "id": 7260,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "functionCall",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "3808:56:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": ">=",
                    "rightExpression": {
                      "argumentTypes": null,
                      "hexValue": "3333",
                      "id": 7261,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "3868:2:30",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_33_by_1",
                        "typeString": "int_const 33"
                      },
                      "value": "33"
                    },
                    "src": "3808:62:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "functionReturnParameters": 7207,
                  "id": 7263,
                  "nodeType": "Return",
                  "src": "3801:69:30"
                }
              ]
            },
            "documentation": "///////////////////////////////////////////////////////////////////////////////////////////////////////////////",
            "id": 7265,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "isConsensusReached",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7204,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7197,
                  "name": "_executingContract",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3314:26:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7196,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "3314:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7199,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3342:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7198,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "3342:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7201,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3360:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7200,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "3360:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7203,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3378:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7202,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "3378:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3313:88:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7207,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7206,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3429:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7205,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "3429:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3428:6:30"
            },
            "scope": 7382,
            "src": "3286:589:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 7336,
              "nodeType": "Block",
              "src": "4429:451:30",
              "statements": [
                {
                  "assignments": [
                    7277
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7277,
                      "name": "assetToken",
                      "nodeType": "VariableDeclaration",
                      "scope": 7337,
                      "src": "4435:20:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_TokenView_$6987",
                        "typeString": "contract TokenView"
                      },
                      "typeName": {
                        "contractScope": null,
                        "id": 7276,
                        "name": "TokenView",
                        "nodeType": "UserDefinedTypeName",
                        "referencedDeclaration": 6987,
                        "src": "4435:9:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_TokenView_$6987",
                          "typeString": "contract TokenView"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7290,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "746f6b656e41646472657373",
                                    "id": 7284,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "string",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "4519:14:30",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    "value": "tokenAddress"
                                  },
                                  {
                                    "argumentTypes": null,
                                    "id": 7285,
                                    "name": "_assetID",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 7267,
                                    "src": "4535:8:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 7282,
                                    "name": "abi",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13255,
                                    "src": "4502:3:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_abi",
                                      "typeString": "abi"
                                    }
                                  },
                                  "id": 7283,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "memberName": "encodePacked",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "4502:16:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                    "typeString": "function () pure returns (bytes memory)"
                                  }
                                },
                                "id": 7286,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "4502:42:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              ],
                              "id": 7281,
                              "name": "keccak256",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13262,
                              "src": "4492:9:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                "typeString": "function () pure returns (bytes32)"
                              }
                            },
                            "id": 7287,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4492:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7279,
                            "name": "database",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 6992,
                            "src": "4468:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DB_$6974",
                              "typeString": "contract DB"
                            }
                          },
                          "id": 7280,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "addressStorage",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6959,
                          "src": "4468:23:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                            "typeString": "function (bytes32) view external returns (address)"
                          }
                        },
                        "id": 7288,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4468:78:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "id": 7278,
                      "name": "TokenView",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 6987,
                      "src": "4458:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_contract$_TokenView_$6987_$",
                        "typeString": "type(contract TokenView)"
                      }
                    },
                    "id": 7289,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4458:89:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_TokenView_$6987",
                      "typeString": "contract TokenView"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "4435:112:30"
                },
                {
                  "assignments": [
                    7292
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7292,
                      "name": "numTokensLocked",
                      "nodeType": "VariableDeclaration",
                      "scope": 7337,
                      "src": "4553:20:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7291,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "4553:4:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7304,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "hexValue": "746f6b656e734c6f636b6564",
                                "id": 7298,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "string",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "4624:14:30",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                "value": "tokensLocked"
                              },
                              {
                                "argumentTypes": null,
                                "id": 7299,
                                "name": "_assetID",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7267,
                                "src": "4640:8:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                }
                              },
                              {
                                "argumentTypes": null,
                                "id": 7300,
                                "name": "_investor",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7269,
                                "src": "4650:9:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                },
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 7296,
                                "name": "abi",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13255,
                                "src": "4607:3:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_abi",
                                  "typeString": "abi"
                                }
                              },
                              "id": 7297,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "memberName": "encodePacked",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "4607:16:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                "typeString": "function () pure returns (bytes memory)"
                              }
                            },
                            "id": 7301,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4607:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          ],
                          "id": 7295,
                          "name": "keccak256",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 13262,
                          "src": "4597:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                            "typeString": "function () pure returns (bytes32)"
                          }
                        },
                        "id": 7302,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4597:64:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7293,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "4576:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7294,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "4576:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7303,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4576:86:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "4553:109:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 7314,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "id": 7306,
                          "name": "_amount",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7271,
                          "src": "4676:7:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 7312,
                              "name": "numTokensLocked",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 7292,
                              "src": "4723:15:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 7309,
                                  "name": "_investor",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 7269,
                                  "src": "4708:9:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 7307,
                                  "name": "assetToken",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 7277,
                                  "src": "4687:10:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_TokenView_$6987",
                                    "typeString": "contract TokenView"
                                  }
                                },
                                "id": 7308,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "balanceOf",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6986,
                                "src": "4687:20:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                  "typeString": "function (address) view external returns (uint256)"
                                }
                              },
                              "id": 7310,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "4687:31:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 7311,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "sub",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6890,
                            "src": "4687:35:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 7313,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "4687:52:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "src": "4676:63:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7305,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "4668:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7315,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4668:72:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7316,
                  "nodeType": "ExpressionStatement",
                  "src": "4668:72:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "hexValue": "746f6b656e734c6f636b6564",
                                "id": 7323,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "string",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "4790:14:30",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                "value": "tokensLocked"
                              },
                              {
                                "argumentTypes": null,
                                "id": 7324,
                                "name": "_assetID",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7267,
                                "src": "4806:8:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                }
                              },
                              {
                                "argumentTypes": null,
                                "id": 7325,
                                "name": "_investor",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7269,
                                "src": "4816:9:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                },
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 7321,
                                "name": "abi",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13255,
                                "src": "4773:3:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_abi",
                                  "typeString": "abi"
                                }
                              },
                              "id": 7322,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "memberName": "encodePacked",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "4773:16:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                "typeString": "function () pure returns (bytes memory)"
                              }
                            },
                            "id": 7326,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4773:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          ],
                          "id": 7320,
                          "name": "keccak256",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 13262,
                          "src": "4763:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                            "typeString": "function () pure returns (bytes32)"
                          }
                        },
                        "id": 7327,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4763:64:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7330,
                            "name": "_amount",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7271,
                            "src": "4849:7:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7328,
                            "name": "numTokensLocked",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7292,
                            "src": "4829:15:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7329,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "add",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6914,
                          "src": "4829:19:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7331,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4829:28:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7317,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "4746:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7319,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "4746:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7332,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4746:112:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7333,
                  "nodeType": "ExpressionStatement",
                  "src": "4746:112:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 7334,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "4871:4:30",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 7275,
                  "id": 7335,
                  "nodeType": "Return",
                  "src": "4864:11:30"
                }
              ]
            },
            "documentation": "///////////////////////////////////////////////////////////////////////////////////////////////////////////////",
            "id": 7337,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "lockTokens",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7272,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7267,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4350:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7266,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "4350:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7269,
                  "name": "_investor",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4368:17:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7268,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "4368:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7271,
                  "name": "_amount",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4387:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 7270,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "4387:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4349:51:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7275,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7274,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4423:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7273,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "4423:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4422:6:30"
            },
            "scope": 7382,
            "src": "4330:550:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "internal"
          },
          {
            "body": {
              "id": 7357,
              "nodeType": "Block",
              "src": "5444:151:30",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "id": 7348,
                                "name": "this",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13367,
                                "src": "5485:4:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_AssetGovernance_$7382",
                                  "typeString": "contract AssetGovernance"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_contract$_AssetGovernance_$7382",
                                  "typeString": "contract AssetGovernance"
                                }
                              ],
                              "id": 7347,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "nodeType": "ElementaryTypeNameExpression",
                              "src": "5477:7:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_type$_t_address_$",
                                "typeString": "type(address)"
                              },
                              "typeName": "address"
                            },
                            "id": 7349,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "typeConversion",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "5477:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7350,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7339,
                            "src": "5492:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7351,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7341,
                            "src": "5502:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7352,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7343,
                            "src": "5513:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "id": 7346,
                          "name": "isConsensusReached",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7265,
                          "src": "5458:18:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_view$_t_address_$_t_bytes32_$_t_bytes4_$_t_bytes32_$returns$_t_bool_$",
                            "typeString": "function (address,bytes32,bytes4,bytes32) view returns (bool)"
                          }
                        },
                        "id": 7353,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "5458:70:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7345,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "5450:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7354,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "5450:79:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7355,
                  "nodeType": "ExpressionStatement",
                  "src": "5450:79:30"
                },
                {
                  "id": 7356,
                  "nodeType": "PlaceholderStatement",
                  "src": "5589:1:30"
                }
              ]
            },
            "documentation": "///////////////////////////////////////////////////////////////////////////////////////////////////////////////",
            "id": 7358,
            "name": "hasConsensus",
            "nodeType": "ModifierDefinition",
            "parameters": {
              "id": 7344,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7339,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7358,
                  "src": "5384:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7338,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "5384:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7341,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7358,
                  "src": "5402:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7340,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "5402:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7343,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7358,
                  "src": "5420:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7342,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "5420:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "5383:60:30"
            },
            "src": "5362:233:30",
            "visibility": "internal"
          },
          {
            "body": {
              "id": 7380,
              "nodeType": "Block",
              "src": "5721:119:30",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        "id": 7376,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "hexValue": "746f6b656e41646472657373",
                                      "id": 7368,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": true,
                                      "kind": "string",
                                      "lValueRequested": false,
                                      "nodeType": "Literal",
                                      "src": "5786:14:30",
                                      "subdenomination": null,
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                        "typeString": "literal_string \"tokenAddress\""
                                      },
                                      "value": "tokenAddress"
                                    },
                                    {
                                      "argumentTypes": null,
                                      "id": 7369,
                                      "name": "_assetID",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 7360,
                                      "src": "5802:8:30",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                        "typeString": "literal_string \"tokenAddress\""
                                      },
                                      {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": null,
                                      "id": 7366,
                                      "name": "abi",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13255,
                                      "src": "5769:3:30",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_magic_abi",
                                        "typeString": "abi"
                                      }
                                    },
                                    "id": 7367,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "memberName": "encodePacked",
                                    "nodeType": "MemberAccess",
                                    "referencedDeclaration": null,
                                    "src": "5769:16:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                      "typeString": "function () pure returns (bytes memory)"
                                    }
                                  },
                                  "id": 7370,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "5769:42:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                ],
                                "id": 7365,
                                "name": "keccak256",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13262,
                                "src": "5759:9:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                  "typeString": "function () pure returns (bytes32)"
                                }
                              },
                              "id": 7371,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "5759:53:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 7363,
                              "name": "database",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 6992,
                              "src": "5735:8:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DB_$6974",
                                "typeString": "contract DB"
                              }
                            },
                            "id": 7364,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "addressStorage",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6959,
                            "src": "5735:23:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                              "typeString": "function (bytes32) view external returns (address)"
                            }
                          },
                          "id": 7372,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "5735:78:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "!=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "hexValue": "30",
                              "id": 7374,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "kind": "number",
                              "lValueRequested": false,
                              "nodeType": "Literal",
                              "src": "5825:1:30",
                              "subdenomination": null,
                              "typeDescriptions": {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              },
                              "value": "0"
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              }
                            ],
                            "id": 7373,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "lValueRequested": false,
                            "nodeType": "ElementaryTypeNameExpression",
                            "src": "5817:7:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_address_$",
                              "typeString": "type(address)"
                            },
                            "typeName": "address"
                          },
                          "id": 7375,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "5817:10:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "src": "5735:92:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7362,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "5727:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7377,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "5727:101:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7378,
                  "nodeType": "ExpressionStatement",
                  "src": "5727:101:30"
                },
                {
                  "id": 7379,
                  "nodeType": "PlaceholderStatement",
                  "src": "5834:1:30"
                }
              ]
            },
            "documentation": null,
            "id": 7381,
            "name": "validAsset",
            "nodeType": "ModifierDefinition",
            "parameters": {
              "id": 7361,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7360,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7381,
                  "src": "5703:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7359,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "5703:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "5702:18:30"
            },
            "src": "5683:157:30",
            "visibility": "internal"
          }
        ],
        "scope": 7383,
        "src": "763:5080:30"
      }
    ],
    "src": "0:5844:30"
  },
  "legacyAST": {
    "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/ownership/AssetGovernance.sol",
    "exportedSymbols": {
      "AssetGovernance": [
        7382
      ],
      "Burner": [
        6944
      ],
      "DB": [
        6974
      ],
      "Escrow": [
        6952
      ],
      "TokenView": [
        6987
      ]
    },
    "id": 7383,
    "nodeType": "SourceUnit",
    "nodes": [
      {
        "id": 6935,
        "literals": [
          "solidity",
          "0.4",
          ".24"
        ],
        "nodeType": "PragmaDirective",
        "src": "0:23:30"
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/math/SafeMath.sol",
        "file": "../math/SafeMath.sol",
        "id": 6936,
        "nodeType": "ImportDirective",
        "scope": 7383,
        "sourceUnit": 6934,
        "src": "25:30:30",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6944,
        "linearizedBaseContracts": [
          6944
        ],
        "name": "Burner",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6943,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "burnEscrow",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6939,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6938,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 6943,
                  "src": "95:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6937,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "95:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "94:18:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6942,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6941,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6943,
                  "src": "131:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6940,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "131:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "130:6:30"
            },
            "scope": 6944,
            "src": "75:62:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "56:83:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6952,
        "linearizedBaseContracts": [
          6952
        ],
        "name": "Escrow",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6951,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "unlockEscrow",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6947,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6946,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 6951,
                  "src": "181:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6945,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "181:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "180:18:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6950,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6949,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6951,
                  "src": "217:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6948,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "217:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "216:6:30"
            },
            "scope": 6952,
            "src": "159:64:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "140:85:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6974,
        "linearizedBaseContracts": [
          6974
        ],
        "name": "DB",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6959,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "addressStorage",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6955,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6954,
                  "name": "_key",
                  "nodeType": "VariableDeclaration",
                  "scope": 6959,
                  "src": "267:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6953,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "267:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "266:14:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6958,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6957,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6959,
                  "src": "305:7:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6956,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "305:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "304:9:30"
            },
            "scope": 6974,
            "src": "243:71:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6966,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "uintStorage",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6962,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6961,
                  "name": "_key",
                  "nodeType": "VariableDeclaration",
                  "scope": 6966,
                  "src": "338:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6960,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "338:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "337:14:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6965,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6964,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6966,
                  "src": "375:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6963,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "375:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "374:6:30"
            },
            "scope": 6974,
            "src": "317:64:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6973,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "setUint",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6971,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6968,
                  "name": "_key",
                  "nodeType": "VariableDeclaration",
                  "scope": 6973,
                  "src": "401:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 6967,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "401:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 6970,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6973,
                  "src": "415:11:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6969,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "415:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "400:27:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6972,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "436:0:30"
            },
            "scope": 6974,
            "src": "384:53:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "226:213:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 6987,
        "linearizedBaseContracts": [
          6987
        ],
        "name": "TokenView",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6979,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "totalSupply",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6975,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "484:2:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6978,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6977,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6979,
                  "src": "510:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6976,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "510:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "509:6:30"
            },
            "scope": 6987,
            "src": "464:52:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6986,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "balanceOf",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6982,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6981,
                  "name": "_tokenHolder",
                  "nodeType": "VariableDeclaration",
                  "scope": 6986,
                  "src": "538:20:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6980,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "538:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "537:22:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6985,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6984,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6986,
                  "src": "583:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6983,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "583:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "582:6:30"
            },
            "scope": 6987,
            "src": "519:70:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 7383,
        "src": "440:151:30"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "contract",
        "documentation": null,
        "fullyImplemented": true,
        "id": 7382,
        "linearizedBaseContracts": [
          7382
        ],
        "name": "AssetGovernance",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "id": 6990,
            "libraryName": {
              "contractScope": null,
              "id": 6988,
              "name": "SafeMath",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6933,
              "src": "798:8:30",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_SafeMath_$6933",
                "typeString": "library SafeMath"
              }
            },
            "nodeType": "UsingForDirective",
            "src": "792:27:30",
            "typeName": {
              "id": 6989,
              "name": "uint256",
              "nodeType": "ElementaryTypeName",
              "src": "811:7:30",
              "typeDescriptions": {
                "typeIdentifier": "t_uint256",
                "typeString": "uint256"
              }
            }
          },
          {
            "constant": false,
            "id": 6992,
            "name": "database",
            "nodeType": "VariableDeclaration",
            "scope": 7382,
            "src": "823:18:30",
            "stateVariable": true,
            "storageLocation": "default",
            "typeDescriptions": {
              "typeIdentifier": "t_contract$_DB_$6974",
              "typeString": "contract DB"
            },
            "typeName": {
              "contractScope": null,
              "id": 6991,
              "name": "DB",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6974,
              "src": "823:2:30",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_DB_$6974",
                "typeString": "contract DB"
              }
            },
            "value": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 7003,
              "nodeType": "Block",
              "src": "887:35:30",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "id": 7001,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftHandSide": {
                      "argumentTypes": null,
                      "id": 6997,
                      "name": "database",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 6992,
                      "src": "893:8:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DB_$6974",
                        "typeString": "contract DB"
                      }
                    },
                    "nodeType": "Assignment",
                    "operator": "=",
                    "rightHandSide": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "id": 6999,
                          "name": "_database",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 6994,
                          "src": "907:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        ],
                        "id": 6998,
                        "name": "DB",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6974,
                        "src": "904:2:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_type$_t_contract$_DB_$6974_$",
                          "typeString": "type(contract DB)"
                        }
                      },
                      "id": 7000,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "typeConversion",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "904:13:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DB_$6974",
                        "typeString": "contract DB"
                      }
                    },
                    "src": "893:24:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_DB_$6974",
                      "typeString": "contract DB"
                    }
                  },
                  "id": 7002,
                  "nodeType": "ExpressionStatement",
                  "src": "893:24:30"
                }
              ]
            },
            "documentation": null,
            "id": 7004,
            "implemented": true,
            "isConstructor": true,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6995,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6994,
                  "name": "_database",
                  "nodeType": "VariableDeclaration",
                  "scope": 7004,
                  "src": "859:17:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6993,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "859:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "858:19:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 6996,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "887:0:30"
            },
            "scope": 7382,
            "src": "847:75:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 7101,
              "nodeType": "Block",
              "src": "1271:637:30",
              "statements": [
                {
                  "assignments": [
                    7023
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7023,
                      "name": "executionID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1277:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7022,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "1277:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7033,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7027,
                            "name": "_executingContract",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7006,
                            "src": "1326:18:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7028,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7008,
                            "src": "1346:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7029,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7010,
                            "src": "1356:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7030,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7012,
                            "src": "1367:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7025,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "1309:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7026,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "1309:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7031,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1309:73:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7024,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "1299:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7032,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1299:84:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1277:106:30"
                },
                {
                  "assignments": [
                    7035
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7035,
                      "name": "numVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1389:18:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7034,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "1389:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7043,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "766f7465546f74616c",
                            "id": 7039,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1437:11:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            "value": "voteTotal"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7040,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7023,
                            "src": "1450:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7037,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "1420:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7038,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "1420:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7041,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1420:42:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7036,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "1410:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7042,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1410:53:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1389:74:30"
                },
                {
                  "assignments": [
                    7045
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7045,
                      "name": "investorVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1469:23:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7044,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "1469:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7055,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "696e766573746f72566f746573",
                            "id": 7049,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "1522:15:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            "value": "investorVotes"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7050,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7023,
                            "src": "1539:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "id": 7051,
                              "name": "msg",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13268,
                              "src": "1552:3:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_magic_message",
                                "typeString": "msg"
                              }
                            },
                            "id": 7052,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "sender",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1552:10:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7047,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "1505:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7048,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "1505:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7053,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1505:58:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7046,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "1495:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7054,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1495:69:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1469:95:30"
                },
                {
                  "assignments": [
                    7057
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7057,
                      "name": "numVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1570:16:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7056,
                        "name": "uint256",
                        "nodeType": "ElementaryTypeName",
                        "src": "1570:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7062,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7060,
                        "name": "numVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7035,
                        "src": "1610:10:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7058,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1589:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7059,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "1589:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7061,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1589:32:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1570:51:30"
                },
                {
                  "assignments": [
                    7064
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7064,
                      "name": "investorVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7102,
                      "src": "1627:21:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7063,
                        "name": "uint256",
                        "nodeType": "ElementaryTypeName",
                        "src": "1627:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7069,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7067,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7045,
                        "src": "1672:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7065,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1651:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7066,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "1651:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7068,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1651:37:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1627:61:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7072,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7008,
                            "src": "1713:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "id": 7073,
                              "name": "msg",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13268,
                              "src": "1723:3:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_magic_message",
                                "typeString": "msg"
                              }
                            },
                            "id": 7074,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "sender",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1723:10:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7075,
                            "name": "_amountToLock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7014,
                            "src": "1735:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "id": 7071,
                          "name": "lockTokens",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7337,
                          "src": "1702:10:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_nonpayable$_t_bytes32_$_t_address_$_t_uint256_$returns$_t_bool_$",
                            "typeString": "function (bytes32,address,uint256) returns (bool)"
                          }
                        },
                        "id": 7076,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1702:47:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7070,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "1694:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7077,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1694:56:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7078,
                  "nodeType": "ExpressionStatement",
                  "src": "1694:56:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7082,
                        "name": "numVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7035,
                        "src": "1773:10:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7085,
                            "name": "_amountToLock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7014,
                            "src": "1798:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7083,
                            "name": "numVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7057,
                            "src": "1785:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7084,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "add",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6914,
                          "src": "1785:12:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7086,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1785:27:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7079,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1756:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7081,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "1756:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7087,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1756:57:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7088,
                  "nodeType": "ExpressionStatement",
                  "src": "1756:57:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7092,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7045,
                        "src": "1836:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7095,
                            "name": "_amountToLock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7014,
                            "src": "1871:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7093,
                            "name": "investorVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7064,
                            "src": "1853:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7094,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "add",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6914,
                          "src": "1853:17:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7096,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1853:32:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7089,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "1819:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7091,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "1819:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7097,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1819:67:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7098,
                  "nodeType": "ExpressionStatement",
                  "src": "1819:67:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 7099,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "1899:4:30",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 7021,
                  "id": 7100,
                  "nodeType": "Return",
                  "src": "1892:11:30"
                }
              ]
            },
            "documentation": null,
            "id": 7102,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [
              {
                "arguments": [
                  {
                    "argumentTypes": null,
                    "id": 7017,
                    "name": "_assetID",
                    "nodeType": "Identifier",
                    "overloadedDeclarations": [],
                    "referencedDeclaration": 7008,
                    "src": "1244:8:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  }
                ],
                "id": 7018,
                "modifierName": {
                  "argumentTypes": null,
                  "id": 7016,
                  "name": "validAsset",
                  "nodeType": "Identifier",
                  "overloadedDeclarations": [],
                  "referencedDeclaration": 7381,
                  "src": "1233:10:30",
                  "typeDescriptions": {
                    "typeIdentifier": "t_modifier$_t_bytes32_$",
                    "typeString": "modifier (bytes32)"
                  }
                },
                "nodeType": "ModifierInvocation",
                "src": "1233:20:30"
              }
            ],
            "name": "voteForExecution",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7015,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7006,
                  "name": "_executingContract",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1112:26:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7005,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "1112:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7008,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1140:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7007,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "1140:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7010,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1158:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7009,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "1158:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7012,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1176:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7011,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "1176:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7014,
                  "name": "_amountToLock",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1200:18:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 7013,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "1200:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "1111:108:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7021,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7020,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7102,
                  "src": "1265:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7019,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "1265:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "1264:6:30"
            },
            "scope": 7382,
            "src": "1086:822:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 7194,
              "nodeType": "Block",
              "src": "2266:637:30",
              "statements": [
                {
                  "assignments": [
                    7121
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7121,
                      "name": "executionID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2272:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7120,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "2272:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7131,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7125,
                            "name": "_executingContract",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7104,
                            "src": "2321:18:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7126,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7106,
                            "src": "2341:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7127,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7108,
                            "src": "2351:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7128,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7110,
                            "src": "2362:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7123,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "2304:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7124,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2304:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7129,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2304:73:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7122,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "2294:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7130,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2294:84:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2272:106:30"
                },
                {
                  "assignments": [
                    7133
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7133,
                      "name": "voteTotalID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2384:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7132,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "2384:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7141,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "766f7465546f74616c",
                            "id": 7137,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "2433:11:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            "value": "voteTotal"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7138,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7121,
                            "src": "2446:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7135,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "2416:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7136,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2416:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7139,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2416:42:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7134,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "2406:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7140,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2406:53:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2384:75:30"
                },
                {
                  "assignments": [
                    7143
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7143,
                      "name": "investorVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2465:23:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7142,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "2465:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7151,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "696e766573746f72566f746573",
                            "id": 7147,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "2518:15:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            "value": "investorVotes"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7148,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7121,
                            "src": "2535:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_042af5aae51512f9b42d057775505e025aa70e031b967222ec6a16d0b0e99f18",
                              "typeString": "literal_string \"investorVotes\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7145,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "2501:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7146,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2501:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7149,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2501:46:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7144,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "2491:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7150,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2491:57:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2465:83:30"
                },
                {
                  "assignments": [
                    7153
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7153,
                      "name": "investorVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2554:18:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7152,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "2554:4:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7158,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7156,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7143,
                        "src": "2596:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7154,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2575:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7155,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "2575:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7157,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2575:37:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2554:58:30"
                },
                {
                  "assignments": [
                    7160
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7160,
                      "name": "totalVotes",
                      "nodeType": "VariableDeclaration",
                      "scope": 7195,
                      "src": "2618:15:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7159,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "2618:4:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7165,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7163,
                        "name": "voteTotalID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7133,
                        "src": "2657:11:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7161,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2636:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7162,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "2636:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7164,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2636:33:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2618:51:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 7169,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "id": 7167,
                          "name": "investorVotes",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7153,
                          "src": "2683:13:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "id": 7168,
                          "name": "_amountToUnlock",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7112,
                          "src": "2700:15:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "src": "2683:32:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7166,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "2675:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7170,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2675:41:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7171,
                  "nodeType": "ExpressionStatement",
                  "src": "2675:41:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7175,
                        "name": "voteTotalID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7133,
                        "src": "2761:11:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7178,
                            "name": "_amountToUnlock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7112,
                            "src": "2789:15:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7176,
                            "name": "totalVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7160,
                            "src": "2774:10:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7177,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "sub",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6890,
                          "src": "2774:14:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7179,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2774:31:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7172,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2744:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7174,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "2744:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7180,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2744:62:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7181,
                  "nodeType": "ExpressionStatement",
                  "src": "2744:62:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 7185,
                        "name": "investorVotesID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7143,
                        "src": "2829:15:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7188,
                            "name": "_amountToUnlock",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7112,
                            "src": "2864:15:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7186,
                            "name": "investorVotes",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7153,
                            "src": "2846:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7187,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "sub",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6890,
                          "src": "2846:17:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7189,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "2846:34:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7182,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "2812:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7184,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "2812:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7190,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2812:69:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7191,
                  "nodeType": "ExpressionStatement",
                  "src": "2812:69:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 7192,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "2894:4:30",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 7119,
                  "id": 7193,
                  "nodeType": "Return",
                  "src": "2887:11:30"
                }
              ]
            },
            "documentation": null,
            "id": 7195,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [
              {
                "arguments": [
                  {
                    "argumentTypes": null,
                    "id": 7115,
                    "name": "_assetID",
                    "nodeType": "Identifier",
                    "overloadedDeclarations": [],
                    "referencedDeclaration": 7106,
                    "src": "2239:8:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  }
                ],
                "id": 7116,
                "modifierName": {
                  "argumentTypes": null,
                  "id": 7114,
                  "name": "validAsset",
                  "nodeType": "Identifier",
                  "overloadedDeclarations": [],
                  "referencedDeclaration": 7381,
                  "src": "2228:10:30",
                  "typeDescriptions": {
                    "typeIdentifier": "t_modifier$_t_bytes32_$",
                    "typeString": "modifier (bytes32)"
                  }
                },
                "nodeType": "ModifierInvocation",
                "src": "2228:20:30"
              }
            ],
            "name": "unlockToken",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7113,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7104,
                  "name": "_executingContract",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2105:26:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7103,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "2105:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7106,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2133:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7105,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "2133:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7108,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2151:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7107,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "2151:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7110,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2169:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7109,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "2169:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7112,
                  "name": "_amountToUnlock",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2193:20:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 7111,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "2193:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "2104:110:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7119,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7118,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7195,
                  "src": "2260:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7117,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "2260:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "2259:6:30"
            },
            "scope": 7382,
            "src": "2084:819:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 7264,
              "nodeType": "Block",
              "src": "3435:440:30",
              "statements": [
                {
                  "assignments": [
                    7209
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7209,
                      "name": "assetToken",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3441:20:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_TokenView_$6987",
                        "typeString": "contract TokenView"
                      },
                      "typeName": {
                        "contractScope": null,
                        "id": 7208,
                        "name": "TokenView",
                        "nodeType": "UserDefinedTypeName",
                        "referencedDeclaration": 6987,
                        "src": "3441:9:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_TokenView_$6987",
                          "typeString": "contract TokenView"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7222,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "746f6b656e41646472657373",
                                    "id": 7216,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "string",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "3525:14:30",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    "value": "tokenAddress"
                                  },
                                  {
                                    "argumentTypes": null,
                                    "id": 7217,
                                    "name": "_assetID",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 7199,
                                    "src": "3541:8:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 7214,
                                    "name": "abi",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13255,
                                    "src": "3508:3:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_abi",
                                      "typeString": "abi"
                                    }
                                  },
                                  "id": 7215,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "memberName": "encodePacked",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "3508:16:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                    "typeString": "function () pure returns (bytes memory)"
                                  }
                                },
                                "id": 7218,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "3508:42:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              ],
                              "id": 7213,
                              "name": "keccak256",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13262,
                              "src": "3498:9:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                "typeString": "function () pure returns (bytes32)"
                              }
                            },
                            "id": 7219,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "3498:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7211,
                            "name": "database",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 6992,
                            "src": "3474:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DB_$6974",
                              "typeString": "contract DB"
                            }
                          },
                          "id": 7212,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "addressStorage",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6959,
                          "src": "3474:23:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                            "typeString": "function (bytes32) view external returns (address)"
                          }
                        },
                        "id": 7220,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "3474:78:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "id": 7210,
                      "name": "TokenView",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 6987,
                      "src": "3464:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_contract$_TokenView_$6987_$",
                        "typeString": "type(contract TokenView)"
                      }
                    },
                    "id": 7221,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3464:89:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_TokenView_$6987",
                      "typeString": "contract TokenView"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3441:112:30"
                },
                {
                  "assignments": [
                    7224
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7224,
                      "name": "executionID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3559:19:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7223,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "3559:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7234,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7228,
                            "name": "_executingContract",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7197,
                            "src": "3608:18:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7229,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7199,
                            "src": "3628:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7230,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7201,
                            "src": "3638:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7231,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7203,
                            "src": "3649:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7226,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "3591:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7227,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3591:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7232,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "3591:73:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7225,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "3581:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7233,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3581:84:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3559:106:30"
                },
                {
                  "assignments": [
                    7236
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7236,
                      "name": "numVotesID",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3671:18:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      },
                      "typeName": {
                        "id": 7235,
                        "name": "bytes32",
                        "nodeType": "ElementaryTypeName",
                        "src": "3671:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7244,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "hexValue": "766f7465546f74616c",
                            "id": 7240,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "kind": "string",
                            "lValueRequested": false,
                            "nodeType": "Literal",
                            "src": "3719:11:30",
                            "subdenomination": null,
                            "typeDescriptions": {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            "value": "voteTotal"
                          },
                          {
                            "argumentTypes": null,
                            "id": 7241,
                            "name": "executionID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7224,
                            "src": "3732:11:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_stringliteral_a940ef52cebf61e0afa7553b1d3f71501bdd3a32b232c0097a8aa81d96915c96",
                              "typeString": "literal_string \"voteTotal\""
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7238,
                            "name": "abi",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13255,
                            "src": "3702:3:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_abi",
                              "typeString": "abi"
                            }
                          },
                          "id": 7239,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "lValueRequested": false,
                          "memberName": "encodePacked",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3702:16:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                            "typeString": "function () pure returns (bytes memory)"
                          }
                        },
                        "id": 7242,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "3702:42:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes_memory_ptr",
                          "typeString": "bytes memory"
                        }
                      ],
                      "id": 7237,
                      "name": "keccak256",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 13262,
                      "src": "3692:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                        "typeString": "function () pure returns (bytes32)"
                      }
                    },
                    "id": 7243,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3692:53:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3671:74:30"
                },
                {
                  "assignments": [
                    7246
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7246,
                      "name": "numTokens",
                      "nodeType": "VariableDeclaration",
                      "scope": 7265,
                      "src": "3751:17:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7245,
                        "name": "uint256",
                        "nodeType": "ElementaryTypeName",
                        "src": "3751:7:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7250,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [],
                    "expression": {
                      "argumentTypes": [],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7247,
                        "name": "assetToken",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 7209,
                        "src": "3771:10:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_TokenView_$6987",
                          "typeString": "contract TokenView"
                        }
                      },
                      "id": 7248,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "totalSupply",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6979,
                      "src": "3771:22:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$__$returns$_t_uint256_$",
                        "typeString": "function () view external returns (uint256)"
                      }
                    },
                    "id": 7249,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3771:24:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3751:44:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 7262,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "id": 7259,
                          "name": "numTokens",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7246,
                          "src": "3854:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        ],
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "hexValue": "313030",
                              "id": 7256,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "kind": "number",
                              "lValueRequested": false,
                              "nodeType": "Literal",
                              "src": "3845:3:30",
                              "subdenomination": null,
                              "typeDescriptions": {
                                "typeIdentifier": "t_rational_100_by_1",
                                "typeString": "int_const 100"
                              },
                              "value": "100"
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_rational_100_by_1",
                                "typeString": "int_const 100"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 7253,
                                  "name": "numVotesID",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 7236,
                                  "src": "3829:10:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 7251,
                                  "name": "database",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 6992,
                                  "src": "3808:8:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DB_$6974",
                                    "typeString": "contract DB"
                                  }
                                },
                                "id": 7252,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "uintStorage",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6966,
                                "src": "3808:20:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                                  "typeString": "function (bytes32) view external returns (uint256)"
                                }
                              },
                              "id": 7254,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3808:32:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 7255,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "mul",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6856,
                            "src": "3808:36:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 7257,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3808:41:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 7258,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "div",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": 6870,
                        "src": "3808:45:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                          "typeString": "function (uint256,uint256) pure returns (uint256)"
                        }
                      },
                      "id": 7260,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "functionCall",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "3808:56:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": ">=",
                    "rightExpression": {
                      "argumentTypes": null,
                      "hexValue": "3333",
                      "id": 7261,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "3868:2:30",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_33_by_1",
                        "typeString": "int_const 33"
                      },
                      "value": "33"
                    },
                    "src": "3808:62:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "functionReturnParameters": 7207,
                  "id": 7263,
                  "nodeType": "Return",
                  "src": "3801:69:30"
                }
              ]
            },
            "documentation": "///////////////////////////////////////////////////////////////////////////////////////////////////////////////",
            "id": 7265,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "isConsensusReached",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7204,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7197,
                  "name": "_executingContract",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3314:26:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7196,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "3314:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7199,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3342:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7198,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "3342:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7201,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3360:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7200,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "3360:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7203,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3378:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7202,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "3378:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3313:88:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7207,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7206,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7265,
                  "src": "3429:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7205,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "3429:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3428:6:30"
            },
            "scope": 7382,
            "src": "3286:589:30",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 7336,
              "nodeType": "Block",
              "src": "4429:451:30",
              "statements": [
                {
                  "assignments": [
                    7277
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7277,
                      "name": "assetToken",
                      "nodeType": "VariableDeclaration",
                      "scope": 7337,
                      "src": "4435:20:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_TokenView_$6987",
                        "typeString": "contract TokenView"
                      },
                      "typeName": {
                        "contractScope": null,
                        "id": 7276,
                        "name": "TokenView",
                        "nodeType": "UserDefinedTypeName",
                        "referencedDeclaration": 6987,
                        "src": "4435:9:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_TokenView_$6987",
                          "typeString": "contract TokenView"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7290,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "746f6b656e41646472657373",
                                    "id": 7284,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "string",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "4519:14:30",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    "value": "tokenAddress"
                                  },
                                  {
                                    "argumentTypes": null,
                                    "id": 7285,
                                    "name": "_assetID",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 7267,
                                    "src": "4535:8:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 7282,
                                    "name": "abi",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13255,
                                    "src": "4502:3:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_abi",
                                      "typeString": "abi"
                                    }
                                  },
                                  "id": 7283,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "memberName": "encodePacked",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "4502:16:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                    "typeString": "function () pure returns (bytes memory)"
                                  }
                                },
                                "id": 7286,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "4502:42:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              ],
                              "id": 7281,
                              "name": "keccak256",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13262,
                              "src": "4492:9:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                "typeString": "function () pure returns (bytes32)"
                              }
                            },
                            "id": 7287,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4492:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7279,
                            "name": "database",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 6992,
                            "src": "4468:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DB_$6974",
                              "typeString": "contract DB"
                            }
                          },
                          "id": 7280,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "addressStorage",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6959,
                          "src": "4468:23:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                            "typeString": "function (bytes32) view external returns (address)"
                          }
                        },
                        "id": 7288,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4468:78:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "id": 7278,
                      "name": "TokenView",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 6987,
                      "src": "4458:9:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_contract$_TokenView_$6987_$",
                        "typeString": "type(contract TokenView)"
                      }
                    },
                    "id": 7289,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4458:89:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_TokenView_$6987",
                      "typeString": "contract TokenView"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "4435:112:30"
                },
                {
                  "assignments": [
                    7292
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 7292,
                      "name": "numTokensLocked",
                      "nodeType": "VariableDeclaration",
                      "scope": 7337,
                      "src": "4553:20:30",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 7291,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "4553:4:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 7304,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "hexValue": "746f6b656e734c6f636b6564",
                                "id": 7298,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "string",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "4624:14:30",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                "value": "tokensLocked"
                              },
                              {
                                "argumentTypes": null,
                                "id": 7299,
                                "name": "_assetID",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7267,
                                "src": "4640:8:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                }
                              },
                              {
                                "argumentTypes": null,
                                "id": 7300,
                                "name": "_investor",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7269,
                                "src": "4650:9:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                },
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 7296,
                                "name": "abi",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13255,
                                "src": "4607:3:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_abi",
                                  "typeString": "abi"
                                }
                              },
                              "id": 7297,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "memberName": "encodePacked",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "4607:16:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                "typeString": "function () pure returns (bytes memory)"
                              }
                            },
                            "id": 7301,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4607:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          ],
                          "id": 7295,
                          "name": "keccak256",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 13262,
                          "src": "4597:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                            "typeString": "function () pure returns (bytes32)"
                          }
                        },
                        "id": 7302,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4597:64:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7293,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "4576:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7294,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "uintStorage",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6966,
                      "src": "4576:20:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_uint256_$",
                        "typeString": "function (bytes32) view external returns (uint256)"
                      }
                    },
                    "id": 7303,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4576:86:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "4553:109:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 7314,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "id": 7306,
                          "name": "_amount",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7271,
                          "src": "4676:7:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 7312,
                              "name": "numTokensLocked",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 7292,
                              "src": "4723:15:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 7309,
                                  "name": "_investor",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 7269,
                                  "src": "4708:9:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 7307,
                                  "name": "assetToken",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 7277,
                                  "src": "4687:10:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_TokenView_$6987",
                                    "typeString": "contract TokenView"
                                  }
                                },
                                "id": 7308,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "balanceOf",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6986,
                                "src": "4687:20:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                  "typeString": "function (address) view external returns (uint256)"
                                }
                              },
                              "id": 7310,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "4687:31:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 7311,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "sub",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6890,
                            "src": "4687:35:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 7313,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "4687:52:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "src": "4676:63:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7305,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "4668:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7315,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4668:72:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7316,
                  "nodeType": "ExpressionStatement",
                  "src": "4668:72:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "hexValue": "746f6b656e734c6f636b6564",
                                "id": 7323,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "string",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "4790:14:30",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                "value": "tokensLocked"
                              },
                              {
                                "argumentTypes": null,
                                "id": 7324,
                                "name": "_assetID",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7267,
                                "src": "4806:8:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                }
                              },
                              {
                                "argumentTypes": null,
                                "id": 7325,
                                "name": "_investor",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 7269,
                                "src": "4816:9:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_stringliteral_c6660bc030d5e557ee51d9255fa1bdee790a37ada066b4d5fbabaecd33bb4dd0",
                                  "typeString": "literal_string \"tokensLocked\""
                                },
                                {
                                  "typeIdentifier": "t_bytes32",
                                  "typeString": "bytes32"
                                },
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 7321,
                                "name": "abi",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13255,
                                "src": "4773:3:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_abi",
                                  "typeString": "abi"
                                }
                              },
                              "id": 7322,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "memberName": "encodePacked",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "4773:16:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                "typeString": "function () pure returns (bytes memory)"
                              }
                            },
                            "id": 7326,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4773:53:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes_memory_ptr",
                              "typeString": "bytes memory"
                            }
                          ],
                          "id": 7320,
                          "name": "keccak256",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 13262,
                          "src": "4763:9:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                            "typeString": "function () pure returns (bytes32)"
                          }
                        },
                        "id": 7327,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4763:64:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        }
                      },
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "id": 7330,
                            "name": "_amount",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7271,
                            "src": "4849:7:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 7328,
                            "name": "numTokensLocked",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7292,
                            "src": "4829:15:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "id": 7329,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "add",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6914,
                          "src": "4829:19:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                            "typeString": "function (uint256,uint256) pure returns (uint256)"
                          }
                        },
                        "id": 7331,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "4829:28:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bytes32",
                          "typeString": "bytes32"
                        },
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "id": 7317,
                        "name": "database",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6992,
                        "src": "4746:8:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DB_$6974",
                          "typeString": "contract DB"
                        }
                      },
                      "id": 7319,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "setUint",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": 6973,
                      "src": "4746:16:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_external_nonpayable$_t_bytes32_$_t_uint256_$returns$__$",
                        "typeString": "function (bytes32,uint256) external"
                      }
                    },
                    "id": 7332,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4746:112:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7333,
                  "nodeType": "ExpressionStatement",
                  "src": "4746:112:30"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 7334,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "4871:4:30",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 7275,
                  "id": 7335,
                  "nodeType": "Return",
                  "src": "4864:11:30"
                }
              ]
            },
            "documentation": "///////////////////////////////////////////////////////////////////////////////////////////////////////////////",
            "id": 7337,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "lockTokens",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 7272,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7267,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4350:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7266,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "4350:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7269,
                  "name": "_investor",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4368:17:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 7268,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "4368:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7271,
                  "name": "_amount",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4387:12:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 7270,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "4387:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4349:51:30"
            },
            "payable": false,
            "returnParameters": {
              "id": 7275,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7274,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 7337,
                  "src": "4423:4:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 7273,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "4423:4:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4422:6:30"
            },
            "scope": 7382,
            "src": "4330:550:30",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "internal"
          },
          {
            "body": {
              "id": 7357,
              "nodeType": "Block",
              "src": "5444:151:30",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "id": 7348,
                                "name": "this",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13367,
                                "src": "5485:4:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_AssetGovernance_$7382",
                                  "typeString": "contract AssetGovernance"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_contract$_AssetGovernance_$7382",
                                  "typeString": "contract AssetGovernance"
                                }
                              ],
                              "id": 7347,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "nodeType": "ElementaryTypeNameExpression",
                              "src": "5477:7:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_type$_t_address_$",
                                "typeString": "type(address)"
                              },
                              "typeName": "address"
                            },
                            "id": 7349,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "typeConversion",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "5477:13:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7350,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7339,
                            "src": "5492:8:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7351,
                            "name": "_methodID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7341,
                            "src": "5502:9:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            }
                          },
                          {
                            "argumentTypes": null,
                            "id": 7352,
                            "name": "_parameterHash",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 7343,
                            "src": "5513:14:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            },
                            {
                              "typeIdentifier": "t_bytes4",
                              "typeString": "bytes4"
                            },
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "id": 7346,
                          "name": "isConsensusReached",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 7265,
                          "src": "5458:18:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_internal_view$_t_address_$_t_bytes32_$_t_bytes4_$_t_bytes32_$returns$_t_bool_$",
                            "typeString": "function (address,bytes32,bytes4,bytes32) view returns (bool)"
                          }
                        },
                        "id": 7353,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "5458:70:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7345,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "5450:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7354,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "5450:79:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7355,
                  "nodeType": "ExpressionStatement",
                  "src": "5450:79:30"
                },
                {
                  "id": 7356,
                  "nodeType": "PlaceholderStatement",
                  "src": "5589:1:30"
                }
              ]
            },
            "documentation": "///////////////////////////////////////////////////////////////////////////////////////////////////////////////",
            "id": 7358,
            "name": "hasConsensus",
            "nodeType": "ModifierDefinition",
            "parameters": {
              "id": 7344,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7339,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7358,
                  "src": "5384:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7338,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "5384:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7341,
                  "name": "_methodID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7358,
                  "src": "5402:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes4",
                    "typeString": "bytes4"
                  },
                  "typeName": {
                    "id": 7340,
                    "name": "bytes4",
                    "nodeType": "ElementaryTypeName",
                    "src": "5402:6:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes4",
                      "typeString": "bytes4"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 7343,
                  "name": "_parameterHash",
                  "nodeType": "VariableDeclaration",
                  "scope": 7358,
                  "src": "5420:22:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7342,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "5420:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "5383:60:30"
            },
            "src": "5362:233:30",
            "visibility": "internal"
          },
          {
            "body": {
              "id": 7380,
              "nodeType": "Block",
              "src": "5721:119:30",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        "id": 7376,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "hexValue": "746f6b656e41646472657373",
                                      "id": 7368,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": true,
                                      "kind": "string",
                                      "lValueRequested": false,
                                      "nodeType": "Literal",
                                      "src": "5786:14:30",
                                      "subdenomination": null,
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                        "typeString": "literal_string \"tokenAddress\""
                                      },
                                      "value": "tokenAddress"
                                    },
                                    {
                                      "argumentTypes": null,
                                      "id": 7369,
                                      "name": "_assetID",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 7360,
                                      "src": "5802:8:30",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                        "typeString": "literal_string \"tokenAddress\""
                                      },
                                      {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": null,
                                      "id": 7366,
                                      "name": "abi",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13255,
                                      "src": "5769:3:30",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_magic_abi",
                                        "typeString": "abi"
                                      }
                                    },
                                    "id": 7367,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "memberName": "encodePacked",
                                    "nodeType": "MemberAccess",
                                    "referencedDeclaration": null,
                                    "src": "5769:16:30",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                      "typeString": "function () pure returns (bytes memory)"
                                    }
                                  },
                                  "id": 7370,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "5769:42:30",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                ],
                                "id": 7365,
                                "name": "keccak256",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13262,
                                "src": "5759:9:30",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                  "typeString": "function () pure returns (bytes32)"
                                }
                              },
                              "id": 7371,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "5759:53:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 7363,
                              "name": "database",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 6992,
                              "src": "5735:8:30",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DB_$6974",
                                "typeString": "contract DB"
                              }
                            },
                            "id": 7364,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "addressStorage",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6959,
                            "src": "5735:23:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                              "typeString": "function (bytes32) view external returns (address)"
                            }
                          },
                          "id": 7372,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "5735:78:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "!=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "hexValue": "30",
                              "id": 7374,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "kind": "number",
                              "lValueRequested": false,
                              "nodeType": "Literal",
                              "src": "5825:1:30",
                              "subdenomination": null,
                              "typeDescriptions": {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              },
                              "value": "0"
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              }
                            ],
                            "id": 7373,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "lValueRequested": false,
                            "nodeType": "ElementaryTypeNameExpression",
                            "src": "5817:7:30",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_address_$",
                              "typeString": "type(address)"
                            },
                            "typeName": "address"
                          },
                          "id": 7375,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "5817:10:30",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "src": "5735:92:30",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 7362,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "5727:7:30",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 7377,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "5727:101:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 7378,
                  "nodeType": "ExpressionStatement",
                  "src": "5727:101:30"
                },
                {
                  "id": 7379,
                  "nodeType": "PlaceholderStatement",
                  "src": "5834:1:30"
                }
              ]
            },
            "documentation": null,
            "id": 7381,
            "name": "validAsset",
            "nodeType": "ModifierDefinition",
            "parameters": {
              "id": 7361,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 7360,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 7381,
                  "src": "5703:16:30",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 7359,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "5703:7:30",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "5702:18:30"
            },
            "src": "5683:157:30",
            "visibility": "internal"
          }
        ],
        "scope": 7383,
        "src": "763:5080:30"
      }
    ],
    "src": "0:5844:30"
  },
  "compiler": {
    "name": "solc",
    "version": "0.4.24+commit.e67f0147.Emscripten.clang"
  },
  "networks": {},
  "schemaVersion": "2.0.1",
  "updatedAt": "2018-10-17T18:28:17.779Z"
}