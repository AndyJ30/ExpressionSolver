//possible token types for the tokenizer
const TokenTypes = {
    Literal: 'Literal',                 
    Variable: 'Variable',
    Operator: 'Operator',
    LeftParenthesis: 'LeftParenthesis',
    RightParenthesis: 'RightParenthesis',
    Function: 'Function',
    Delimiter: 'Delimiter'    
}

//enum of possible operator associativities
const Associativity = {
    Left: 'Left',
    Right: 'Right'
}

//class represents a mathematical operator
class Operator {
    constructor (chr, precidence, associativity, evalFunction){
        this.chr = chr;                     //single character that represents this operator
        this.precidence = precidence;       //priority of this operator (BODMAS)
        this.associativity = associativity; //associativity of this operator (left or right)
        this.eval = evalFunction;           //function that implements this operator
    }

};

//supported operators
const Operators = {
    '+': new Operator ('+', 1, Associativity.Left, (a,b)=>{return a+b}),
    '-': new Operator ('-', 1, Associativity.Left, (a,b)=>{return a-b}),
    '*': new Operator ('*', 2, Associativity.Left, (a,b)=>{return a*b}),
    '/': new Operator ('/', 2, Associativity.Left, (a,b)=>{return a/b}),
    '^': new Operator ('^', 3, Associativity.Right, Math.pow)
};

//supported functions in addition to standard javascript Math functions
const MathFunctions = {
    'avg': (...args) => args.reduce( (total, currentValue) => total + currentValue ) / args.length ,
    'mean': (...args) => args.reduce( (total, currentValue) => total + currentValue ) / args.length ,
    'median': (...args) => {
        args.sort( (a,b)=>a-b);
        if (args.length % 2 === 0){ 
            return (args[args.length/2 - 1] + args[args.length/2]) / 2 
        }
        else { 
            return args[args.length/2] 
        }
    },
    'mode': (...args) => {
        args.sort((a,b)=>a-b);
        let mode;
        let count = 0;
        let maxCount = 0;

        args.forEach( (n, i, arr) => {
            if (i === 0 || (i > 0 && arr[i-1] === n) ) {
                count ++;
            }
            else{
                count = 1;
            }
            if (mode === undefined || count > maxCount){
                maxCount = count;
                mode = n;
            }            
        })

        return mode;
    }
};

//class represents a complete parsed token
class Token {
    constructor (type, value){
        this.type = type;
        this.value = value;
    }
    isValid(){
        return (TokenTypes[this.type] && this.value.length > 0)
    }
    get associativity(){
        return Operators[this.value].associativity;
    }
    get precidence(){
        return Operators[this.value].precidence;
    }
}

//class represents a character that belongs to a token during parsing
class TokenFragment {
    constructor (type, chr){
        this.type = type;
        this.chr = chr;
    }
    isValid(){
        return (TokenTypes[this.type] && this.chr.length === 1)
    } 
}

//class that builds a list of Tokens from a stream of TokenFragments
class TokenBuffer {
    constructor (){
        this.tokens = [];
        this._typeBuffer;
        this._chrBuffer = [];
    }
    write(tokenFragment){
        if (this._typeBuffer && (tokenFragment.type != this._typeBuffer) || isSingleCharacterToken(this._typeBuffer)){
            if (this._typeBuffer === TokenTypes.Variable && tokenFragment.type === TokenTypes.LeftParenthesis){
                this._typeBuffer = TokenTypes.Function;
            }            
            this.flush();
        }
        this._typeBuffer = tokenFragment.type;
        this._chrBuffer.push(tokenFragment.chr);
    }
    flush(){
        if (TokenTypes[this._typeBuffer] && this._chrBuffer.length > 0){
            this.tokens.push(new Token(this._typeBuffer, this._chrBuffer.join('')))
        }
        this._typeBuffer = undefined;
        this._chrBuffer = [];
    }
}

//Helper functions for the tokenizer
function isDigit(chr){
    return ((chr >= '0' && chr <= '9') || chr === '.');
}

function isLetter(chr){
    return ((chr >= 'a' && chr <= 'z') || (chr >= 'A' && chr <= 'Z'));
}

function isOperator(chr){
    return Operators.hasOwnProperty(chr);
}

//helper function for TokenBuffer
function isSingleCharacterToken(tokenType){
    return [
        TokenTypes.LeftParenthesis, 
        TokenTypes.RightParenthesis, 
        TokenTypes.Delimter
    ].includes(tokenType);
}

//builds a list of tokens from an input string
function tokenize(str){
    
    let buffer = new TokenBuffer();
    str = str.replace(/\s+/g, "").split("");

    str.forEach(chr=>{
        if (isDigit(chr)){
            buffer.write(new TokenFragment(TokenTypes.Literal, chr));
        }
        else if (isLetter(chr)){
            buffer.write(new TokenFragment(TokenTypes.Variable, chr));
        }
        else if (isOperator(chr)){
            buffer.write(new TokenFragment(TokenTypes.Operator, chr));
        }
        else if (chr === ','){
            buffer.write(new TokenFragment(TokenTypes.Delimiter, chr));
        }
        else if (chr === '('){
            buffer.write(new TokenFragment(TokenTypes.LeftParenthesis, chr));
        }
        else if (chr === ')'){
            buffer.write(new TokenFragment(TokenTypes.RightParenthesis, chr));
        }
    });

    buffer.flush();
    return buffer.tokens;
    
};

//helper class for parser
class Stack extends Array {
    peek(){
        return this.slice(-1)[0];
    }
};

//helper class that implements an AST as an array of ASTNodes
class AbstractSyntaxTree extends Array {
    addOperator(token, argumentCount){
        let args = []
        argumentCount = argumentCount || 2;
        
        for (let i = 0; i < argumentCount; i++ ){
            args.push(this.pop());
        }
        args.reverse();
        this.push(new ASTNode(token, args));
    };
    solve(){
        if (this[0]){
            return this[0].solve();
        }
        else{
            throw new Exception ('Cannot solve an empty tree');
        }
    };
};

//class represents an AST node and implements the solver
class ASTNode{
    constructor(token, args){
        this.token = token;
        this.args = args;
    }
    solve(){
        if (this.token.type === TokenTypes.Literal){
            return parseFloat(this.token.value);
        }
        else if (this.token.type === TokenTypes.Operator){
            this.args = this.args.map( arg => {return arg.solve()});
            return Operators[this.token.value].eval(...this.args);
        }
        else if (this.token.type === TokenTypes.Function){
            this.args = this.args.map( arg => {return arg.solve()});
                
            try {
                if (MathFunctions[this.token.value]){
                    return MathFunctions[this.token.value](...this.args);
                }
                else{
                    return Math[this.token.value](...this.args);
                }                    
            }
            catch (err){
                if (err instanceof TypeError){
                    err.message = err.message.replace('[this.token.value]', '.' + this.token.value);
                }
                throw err;
            }
        }
    }
}

//create an AST from a list of tokens using the shunting yard algorithm 
function parse(tokens){
    let output = new AbstractSyntaxTree();
    let stack = new Stack();
    var argCount = 0;
    tokens.forEach(token=>{
        switch (token.type){
            case TokenTypes.Literal:
            case TokenTypes.Variable:
                output.push(new ASTNode(token));
                break;

            case TokenTypes.Function:
                stack.push(token);
                break;
            
            case TokenTypes.Delimiter:
                while (stack.peek().type != TokenTypes.LeftParenthesis){
                    output.addOperator(stack.pop());
                }
                argCount++;
                break;
            
            case TokenTypes.Operator:
                let o = stack.peek();
                while (o && o.type === TokenTypes.Operator && (
                    (token.associativity === Associativity.Left && token.precidence <= o.precidence)
                    ||(token.associativity === Associativity.Right && token.precidence < o.precidence)
                    )
                ){
                    output.addOperator(stack.pop());
                    o = stack.peek();
                }

                stack.push(token);
                break;
            
            case TokenTypes.LeftParenthesis:
                stack.push(token);
                break;
            
            case TokenTypes.RightParenthesis:
                while (stack.peek().type != TokenTypes.LeftParenthesis){
                    output.addOperator(stack.pop());
                }
                stack.pop();
                
                if (stack.peek() && stack.peek().type === TokenTypes.Function){
                    output.addOperator(stack.pop(), argCount + 1);
                    
                }
                break;

        }
    });

    while (stack.peek()){
        output.addOperator(stack.pop());
    }

    return output;
}

//solve a mathematical expression as a string
function solve(expression){
    return parse(tokenize(expression)).solve();
}

