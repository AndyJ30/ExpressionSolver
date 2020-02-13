const TokenTypes = {
    Literal: 'Literal',
    Variable: 'Variable',
    Operator: 'Operator',
    LeftParenthesis: 'LeftParenthesis',
    RightParenthesis: 'RightParenthesis',
    Function: 'Function',
    Delimter: 'Delimiter'    
}

const Associativity = {
    Left: 'Left',
    Right: 'Right'
}

class Operator {
    constructor (chr, precidence, associativity, evalFunction){
        this.chr = chr;
        this.precidence = precidence;
        this.associativity = associativity;
        this.eval = evalFunction;
    }

};

const Operators = {
    '+': new Operator ('+', 2, Associativity.Left, (a,b)=>{return a+b}),
    '-': new Operator ('-', 2, Associativity.Left, (a,b)=>{return a-b}),
    '*': new Operator ('*', 3, Associativity.Left, (a,b)=>{return a*b}),
    '/': new Operator ('/', 3, Associativity.Left, (a,b)=>{return a/b}),
    '^': new Operator ('^', 4, Associativity.Right, (a,b)=>{return Math.pow(a,b)})
};    

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

class TokenFragment {
    constructor (type, chr){
        this.type = type;
        this.chr = chr;
    }
    isValid(){
        return (TokenTypes[this.type] && this.chr.length === 1)
    } 
}

class TokenBuffer {
    constructor (){
        this.tokens = [];
        this._typeBuffer;
        this._chrBuffer = [];
    }
    write(tokenFragment){
        if (this._typeBuffer && tokenFragment.type != this._typeBuffer){
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

function isDigit(chr){
    return ((chr >= '0' && chr <= '9') || chr === '.');
}

function isLetter(chr){
    return ((chr >= 'a' && chr <= 'z') || (chr >= 'A' && chr <= 'Z'));
}

function isOperator(chr){
    return Operators.hasOwnProperty(chr);
}

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
            buffer.write(new TokenFragment(TokenTypes.ArgumentDelimter, chr));
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

class Stack extends Array {
    peek(){
        return this.slice(-1)[0];
    }
};

class AbstractSyntaxTree extends Array {
    addOperator(token){
        let rightChild = this.pop();
        let leftChild = this.pop();
        this.push(new ASTNode(token, leftChild, rightChild));
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

class ASTNode{
    constructor(token, leftChild, rightChild){
        this.token = token;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
    }
    toString(padding){
        if (!this.leftChild && !this.rightChild){
            return `${this.token.value}\t=>null\n${Array(padding+1).join("\t")}=>null`;   
        }
        
        padding = padding || 1;
        padding++;
        return `${this.token.value}\t=>${this.leftChild.toString(padding)}\n${Array(padding).join("\t")}=>${this.rightChild.toString(padding)}`;
    };
    solve(){
        if (this.token.type === TokenTypes.Literal){
            return parseFloat(this.token.value);
        }
        else if (this.token.type === TokenTypes.Operator){
            let leftOperand = this.leftChild.solve();
            let rightOperand = this.rightChild.solve();
            return Operators[this.token.value].eval(leftOperand, rightOperand);
        }
    }
}

function parse(tokens){
    let output = new AbstractSyntaxTree();
    let stack = new Stack();
    tokens.forEach(token=>{
        switch (token.type){
            case TokenTypes.Literal:
            case TokenTypes.Variable:
                output.push(new ASTNode(token));
                break;

            case TokenTypes.Function:
                stack.push(token);
                break;
            
            case TokenTypes.Delimter:
                while (stack.peek().type != TokenTypes.LeftParenthesis){
                    output.addOperator(stack.pop());
                }
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
                break;
        }

        if (stack.peek() && stack.peek().type === TokenTypes.Function){
            output.addOperator(stack.pop());
        }
    });

    while (stack.peek()){
        output.addOperator(stack.pop());
    }

    return output;
}

function solve(expression){
    return parse(tokenize(expression)).solve();
}

console.log( solve('3 + 4 * 2 / ( 1 - 5 ) ^2^3') );

