"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var ERC20 = exports.ERC20 = 
{
  "contractName": "ERC20",
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
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
          "name": "_who",
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
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_owner",
          "type": "address"
        },
        {
          "name": "_spender",
          "type": "address"
        }
      ],
      "name": "allowance",
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
      "constant": false,
      "inputs": [
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_spender",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_from",
          "type": "address"
        },
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  "bytecode": "0x",
  "deployedBytecode": "0x",
  "sourceMap": "",
  "deployedSourceMap": "",
  "source": "pragma solidity ^0.4.24;\n\n\n/**\n * @title ERC20 interface\n * @dev see https://github.com/ethereum/EIPs/issues/20\n */\ninterface ERC20 {\n  function totalSupply() external view returns (uint256);\n\n  function balanceOf(address _who) external view returns (uint256);\n\n  function allowance(address _owner, address _spender) external view returns (uint256);\n\n  function transfer(address _to, uint256 _value) external returns (bool);\n\n  function approve(address _spender, uint256 _value) external returns (bool);\n\n  function transferFrom(address _from, address _to, uint256 _value) external returns (bool);\n\n  event Transfer(address indexed from, address indexed to, uint256 value);\n\n  event Approval(address indexed owner, address indexed spender, uint256 value);\n}\n",
  "sourcePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/interfaces/ERC20.sol",
  "ast": {
    "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/interfaces/ERC20.sol",
    "exportedSymbols": {
      "ERC20": [
        6697
      ]
    },
    "id": 6698,
    "nodeType": "SourceUnit",
    "nodes": [
      {
        "id": 6630,
        "literals": [
          "solidity",
          "^",
          "0.4",
          ".24"
        ],
        "nodeType": "PragmaDirective",
        "src": "0:24:23"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": "@title ERC20 interface\n@dev see https://github.com/ethereum/EIPs/issues/20",
        "fullyImplemented": false,
        "id": 6697,
        "linearizedBaseContracts": [
          6697
        ],
        "name": "ERC20",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6635,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "totalSupply",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6631,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "156:2:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6634,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6633,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6635,
                  "src": "182:7:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6632,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "182:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "181:9:23"
            },
            "scope": 6697,
            "src": "136:55:23",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6642,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "balanceOf",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6638,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6637,
                  "name": "_who",
                  "nodeType": "VariableDeclaration",
                  "scope": 6642,
                  "src": "214:12:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6636,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "214:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "213:14:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6641,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6640,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6642,
                  "src": "251:7:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6639,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "251:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "250:9:23"
            },
            "scope": 6697,
            "src": "195:65:23",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6651,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "allowance",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6647,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6644,
                  "name": "_owner",
                  "nodeType": "VariableDeclaration",
                  "scope": 6651,
                  "src": "283:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6643,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "283:7:23",
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
                  "id": 6646,
                  "name": "_spender",
                  "nodeType": "VariableDeclaration",
                  "scope": 6651,
                  "src": "299:16:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6645,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "299:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "282:34:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6650,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6649,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6651,
                  "src": "340:7:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6648,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "340:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "339:9:23"
            },
            "scope": 6697,
            "src": "264:85:23",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6660,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "transfer",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6656,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6653,
                  "name": "_to",
                  "nodeType": "VariableDeclaration",
                  "scope": 6660,
                  "src": "371:11:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6652,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "371:7:23",
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
                  "id": 6655,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6660,
                  "src": "384:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6654,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "384:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "370:29:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6659,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6658,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6660,
                  "src": "418:4:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6657,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "418:4:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "417:6:23"
            },
            "scope": 6697,
            "src": "353:71:23",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6669,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "approve",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6665,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6662,
                  "name": "_spender",
                  "nodeType": "VariableDeclaration",
                  "scope": 6669,
                  "src": "445:16:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6661,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "445:7:23",
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
                  "id": 6664,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6669,
                  "src": "463:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6663,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "463:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "444:34:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6668,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6667,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6669,
                  "src": "497:4:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6666,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "497:4:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "496:6:23"
            },
            "scope": 6697,
            "src": "428:75:23",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6680,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "transferFrom",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6676,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6671,
                  "name": "_from",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "529:13:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6670,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "529:7:23",
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
                  "id": 6673,
                  "name": "_to",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "544:11:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6672,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "544:7:23",
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
                  "id": 6675,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "557:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6674,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "557:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "528:44:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6679,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6678,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "591:4:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6677,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "591:4:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "590:6:23"
            },
            "scope": 6697,
            "src": "507:90:23",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "anonymous": false,
            "documentation": null,
            "id": 6688,
            "name": "Transfer",
            "nodeType": "EventDefinition",
            "parameters": {
              "id": 6687,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6682,
                  "indexed": true,
                  "name": "from",
                  "nodeType": "VariableDeclaration",
                  "scope": 6688,
                  "src": "616:20:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6681,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "616:7:23",
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
                  "id": 6684,
                  "indexed": true,
                  "name": "to",
                  "nodeType": "VariableDeclaration",
                  "scope": 6688,
                  "src": "638:18:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6683,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "638:7:23",
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
                  "id": 6686,
                  "indexed": false,
                  "name": "value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6688,
                  "src": "658:13:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6685,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "658:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "615:57:23"
            },
            "src": "601:72:23"
          },
          {
            "anonymous": false,
            "documentation": null,
            "id": 6696,
            "name": "Approval",
            "nodeType": "EventDefinition",
            "parameters": {
              "id": 6695,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6690,
                  "indexed": true,
                  "name": "owner",
                  "nodeType": "VariableDeclaration",
                  "scope": 6696,
                  "src": "692:21:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6689,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "692:7:23",
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
                  "id": 6692,
                  "indexed": true,
                  "name": "spender",
                  "nodeType": "VariableDeclaration",
                  "scope": 6696,
                  "src": "715:23:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6691,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "715:7:23",
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
                  "id": 6694,
                  "indexed": false,
                  "name": "value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6696,
                  "src": "740:13:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6693,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "740:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "691:63:23"
            },
            "src": "677:78:23"
          }
        ],
        "scope": 6698,
        "src": "116:641:23"
      }
    ],
    "src": "0:758:23"
  },
  "legacyAST": {
    "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/interfaces/ERC20.sol",
    "exportedSymbols": {
      "ERC20": [
        6697
      ]
    },
    "id": 6698,
    "nodeType": "SourceUnit",
    "nodes": [
      {
        "id": 6630,
        "literals": [
          "solidity",
          "^",
          "0.4",
          ".24"
        ],
        "nodeType": "PragmaDirective",
        "src": "0:24:23"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": "@title ERC20 interface\n@dev see https://github.com/ethereum/EIPs/issues/20",
        "fullyImplemented": false,
        "id": 6697,
        "linearizedBaseContracts": [
          6697
        ],
        "name": "ERC20",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 6635,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "totalSupply",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6631,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "156:2:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6634,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6633,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6635,
                  "src": "182:7:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6632,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "182:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "181:9:23"
            },
            "scope": 6697,
            "src": "136:55:23",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6642,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "balanceOf",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6638,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6637,
                  "name": "_who",
                  "nodeType": "VariableDeclaration",
                  "scope": 6642,
                  "src": "214:12:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6636,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "214:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "213:14:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6641,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6640,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6642,
                  "src": "251:7:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6639,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "251:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "250:9:23"
            },
            "scope": 6697,
            "src": "195:65:23",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6651,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "allowance",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6647,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6644,
                  "name": "_owner",
                  "nodeType": "VariableDeclaration",
                  "scope": 6651,
                  "src": "283:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6643,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "283:7:23",
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
                  "id": 6646,
                  "name": "_spender",
                  "nodeType": "VariableDeclaration",
                  "scope": 6651,
                  "src": "299:16:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6645,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "299:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "282:34:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6650,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6649,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6651,
                  "src": "340:7:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6648,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "340:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "339:9:23"
            },
            "scope": 6697,
            "src": "264:85:23",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6660,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "transfer",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6656,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6653,
                  "name": "_to",
                  "nodeType": "VariableDeclaration",
                  "scope": 6660,
                  "src": "371:11:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6652,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "371:7:23",
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
                  "id": 6655,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6660,
                  "src": "384:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6654,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "384:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "370:29:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6659,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6658,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6660,
                  "src": "418:4:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6657,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "418:4:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "417:6:23"
            },
            "scope": 6697,
            "src": "353:71:23",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6669,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "approve",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6665,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6662,
                  "name": "_spender",
                  "nodeType": "VariableDeclaration",
                  "scope": 6669,
                  "src": "445:16:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6661,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "445:7:23",
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
                  "id": 6664,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6669,
                  "src": "463:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6663,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "463:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "444:34:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6668,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6667,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6669,
                  "src": "497:4:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6666,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "497:4:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "496:6:23"
            },
            "scope": 6697,
            "src": "428:75:23",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 6680,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "transferFrom",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 6676,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6671,
                  "name": "_from",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "529:13:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6670,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "529:7:23",
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
                  "id": 6673,
                  "name": "_to",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "544:11:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6672,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "544:7:23",
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
                  "id": 6675,
                  "name": "_value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "557:14:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6674,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "557:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "528:44:23"
            },
            "payable": false,
            "returnParameters": {
              "id": 6679,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6678,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 6680,
                  "src": "591:4:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 6677,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "591:4:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "590:6:23"
            },
            "scope": 6697,
            "src": "507:90:23",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "anonymous": false,
            "documentation": null,
            "id": 6688,
            "name": "Transfer",
            "nodeType": "EventDefinition",
            "parameters": {
              "id": 6687,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6682,
                  "indexed": true,
                  "name": "from",
                  "nodeType": "VariableDeclaration",
                  "scope": 6688,
                  "src": "616:20:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6681,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "616:7:23",
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
                  "id": 6684,
                  "indexed": true,
                  "name": "to",
                  "nodeType": "VariableDeclaration",
                  "scope": 6688,
                  "src": "638:18:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6683,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "638:7:23",
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
                  "id": 6686,
                  "indexed": false,
                  "name": "value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6688,
                  "src": "658:13:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6685,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "658:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "615:57:23"
            },
            "src": "601:72:23"
          },
          {
            "anonymous": false,
            "documentation": null,
            "id": 6696,
            "name": "Approval",
            "nodeType": "EventDefinition",
            "parameters": {
              "id": 6695,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 6690,
                  "indexed": true,
                  "name": "owner",
                  "nodeType": "VariableDeclaration",
                  "scope": 6696,
                  "src": "692:21:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6689,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "692:7:23",
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
                  "id": 6692,
                  "indexed": true,
                  "name": "spender",
                  "nodeType": "VariableDeclaration",
                  "scope": 6696,
                  "src": "715:23:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 6691,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "715:7:23",
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
                  "id": 6694,
                  "indexed": false,
                  "name": "value",
                  "nodeType": "VariableDeclaration",
                  "scope": 6696,
                  "src": "740:13:23",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 6693,
                    "name": "uint256",
                    "nodeType": "ElementaryTypeName",
                    "src": "740:7:23",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "691:63:23"
            },
            "src": "677:78:23"
          }
        ],
        "scope": 6698,
        "src": "116:641:23"
      }
    ],
    "src": "0:758:23"
  },
  "compiler": {
    "name": "solc",
    "version": "0.4.24+commit.e67f0147.Emscripten.clang"
  },
  "networks": {},
  "schemaVersion": "2.0.1",
  "updatedAt": "2018-10-17T18:28:17.823Z"
}