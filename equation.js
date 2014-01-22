
var logBase10 = function(value) {
    return Math.log(value)/Math.log(10);
}
var functions={"cos":Math.cos, "sin":Math.sin, "tan":Math.tan, "abs":Math.abs, "sqrt":Math.sqrt, "ln":Math.log, "log":logBase10, "acos":Math.acos, "asin":Math.asin, "atan":Math.atan};//if you think of any more functions, just put them here and they will work like magic! Must be between length 2 and 4 (or you could just change the code below)
var MAX_FUNCTION_LENGTH = 4;
var MIN_FUNCTION_LENGTH = 2;

//this is the equation evaluator
//input equation string like m*a and inputs like ["m", "G"]
//this is pretty slow. don't do it in a tight loop
//this function is recursive. it cuts up the equation and analyzes each part separately.
function evaluateExpression(equation, inputs) {
    //I'm pretty sure this removes all whitespace.
    equation = equation.replace(/\s/g, "");
    //if equation is an input (like 't'), return the value for that input.
    if (equation in inputs) {
        return inputs[equation];
    }
    //make each variable x like (x) so that 5(x) can work
    //to avoid infinite recursion, make sure each substring like (((x))) is turned into (x)
    for (var variable in inputs) {
        var prevLength = 0;
        while (prevLength!=equation.length) {
            //it looks like this will only go through the loop once, but actually the length of equation might change before the end of the loop
            prevLength = equation.length;
            equation = equation.replace("("+variable+")", variable);//first remove parenthesis from ((x)), if they exist
        }
        
        equation = equation.replace(variable, "("+variable+")");//then add parenthesis back
    }
    //if start with - or $ (my negative replacement), negate entire expression
    if (equation.indexOf("-")==0 || equation.indexOf("$")==0) {
        return -1*evaluateExpression(equation.slice(1), inputs);
    }
    for (var i=1; i<equation.length; i++) {//phantom multiplication (first char cannot have a phantom *)
        //5(3) should become 5*(3)
        //5cos(3) should become 5*cos(3)
        if (equation.charAt(i)=="(") {
            var insertionIndex = i;
            //size of unary operation
            for (var size=MAX_FUNCTION_LENGTH; size>=MIN_FUNCTION_LENGTH; size--) {
                if (i>=size) {
                    var charsBefore = equation.slice(i-size,i);
                    if (charsBefore in functions) {
                        insertionIndex = i-size;
                        break;
                    }
                }
            }
            if (insertionIndex) {
                var prevChar = equation.charAt(insertionIndex-1);
                if (prevChar=="*" || prevChar=="+" || prevChar=="/" || prevChar=="-" || prevChar=="^" || prevChar=="(") {
                    
                } else {
                    equation=equation.slice(0,insertionIndex).concat("*",equation.slice(insertionIndex));
                    i++;
                }
            }
        }
    }
    //parenthesis
    //get rid of all parentheses
    while (equation.indexOf("(")>=0) {
        //use for (a*(m+a)) and (a+m)*(a+a). thus you can't just take the first '(' and last ')' and you can't take the first '(' and first ')' parentheses. You have to make sure the nested parentheses match up
        //start at the first '('
        var startIndex = equation.indexOf("(");
        var endIndex = startIndex+1;
        var nestedParens = 0;
        //find end index
        //stop when outside of nested parentheses and the character is a ')'
        while (equation.charAt(endIndex)!=")" || nestedParens) {
            if (equation.charAt(endIndex)==")") {
                nestedParens--;
            }
            if (equation.charAt(endIndex)=="(") {
                nestedParens++;
            }
            endIndex++;
        }
        //find what's in the parentheses and also include the parenthesis.
        var inParens = equation.slice(startIndex+1, endIndex);
        var includingParens = equation.slice(startIndex, endIndex+1);
        
        var value = evaluateExpression(inParens, inputs);
        //size of unary operation
        //in range. Must enumerate backwards so acos(x) does not get interpreted as a(cos(x))
        for (var size=4; size>=2; size--) {
            if (startIndex>=size) {
                var charsBefore = equation.slice(startIndex-size, startIndex);
                if (charsBefore in functions) {
                    value = functions[charsBefore](value);
                    includingParens=equation.slice(startIndex-size, endIndex+1);
                    break;
                }
            }
        }
        
        if (includingParens==equation) {//like (5) or cos(3)
            return value;
        } else {
            //replace in equation.
            equation = equation.replace(includingParens, value);
        }
    }
    //done with parentheses
    
    //deal with negatives. replace with dollar sign
    //this is so 4/-7 doesn't get interpreted as (4/)-7, which could raise a divide by zero error
    equation = equation.replace("*-", "*$");
    equation = equation.replace("--", "+");//minus negative is plus
    equation = equation.replace("+-", "-");//add negative is minus
    equation = equation.replace("/-", "/$");
    equation = equation.replace("(-", "($");
    
    //now the divide and conquer algorithm (or whatever this is)
    
    //check if equation contains any operations like "+", "-", "/", etc.
	if (equation.indexOf("+")>=0) {
        //start at zero and add from there
        var sum = 0;
        var toAdd = equation.split("+");//divide
        for (var operand in toAdd) {
            sum += evaluateExpression(toAdd[operand], inputs);//conquer
        }
        //everything has been taken care of.
        return sum;
    }
    if (equation.indexOf("-")>=0) {
        var diff = 0;
        var toSub = equation.split("-");
        var first = true; //if looking at the first operand, it's positive. Subtract all others.
        //this is much easier in Haskell
        //first:toSum = first - (sum toSub)
        for (var op in toSub) {
            if (first) diff = evaluateExpression(toSub[op], inputs);
            else diff -= evaluateExpression(toSub[op], inputs);
            first=false;
        }
        return diff;
    }
	if (equation.indexOf("*")>=0) {
		var multiple = 1;//start with one (multiplicative identity)
		var toMultiply = equation.split("*");
		for (var factor in toMultiply) {
			multiple *= evaluateExpression(toMultiply[factor], inputs);
		}
		return multiple;
	}
    if (equation.indexOf("/")>=0) {
        var quot = 0;
        var toDiv = equation.split("/");
        var first = true;
        for (var op in toDiv) {
            if (first) quot = evaluateExpression(toDiv[op], inputs);
            else quot /= evaluateExpression(toDiv[op], inputs);
            first=false;
        }
        return quot;
    }
    if (equation.indexOf("^")>=0) {
        var exp = 0;
        var toPow = equation.split("^");
        var first = true;
        for (var op in toPow) {
            if (first) exp = evaluateExpression(toPow[op], inputs);
            else exp = Math.pow(exp, evaluateExpression(toPow[op], inputs));
            first=false;
        }
        return exp;
    }
    
    //no function. assume it's a number (base 10 of course)
    var value = parseFloat(equation, 10);
    if (equation.charAt(0)=="$") {//negative
        value = parseFloat(equation.slice(1), 10) * -1;
    }
	return value;
}

//for testing.
function testExpressionEvaluate(expression, inputs) {
    console.log(expression+"="+evaluateExpression(expression, inputs));
}
/*
 //this is an experiment to create a custom function from 5+x that can be evaluated with f(2) and f(5). As far as I know, this is impossible in javascript (but not in Objective-C. Check out Multi-Calc).
function copyFunction(func) {
	eval("var thecopy = " + func.toString());
	return thecopy;
}

function createFunction(expression) {
	function theFunction() {
		return 0;
	}
	if (expression.indexOf("+")>=0) {
        var sum = theFunction;
        var toAdd = expression.split("+");
        for (operand in toAdd) {
        	var prevsum = copyFunction(sum);
        	var operandsum = createFunction(toAdd[operand]);
        	sum = function() {
        		return prevsum()+operandsum();
        	}
        }
        return sum;
    }
    var value = parseFloat(expression, 10);
    return function() {
    	return value;
    }
}

var sumFunc = createFunction("4+3");
console.log(sumFunc());
*/
//testing
testExpressionEvaluate("3(5)", {});
testExpressionEvaluate("cos(x)", {"x":Math.PI});
testExpressionEvaluate("acos(-1)", {});
testExpressionEvaluate("abs(-4)", {});
testExpressionEvaluate("ln(10)", {});
testExpressionEvaluate("log(10)", {});
testExpressionEvaluate("5cos(3.14)", {});
testExpressionEvaluate("3abs(-x)", {"x":3});
testExpressionEvaluate("4+sin(bit)", {"bit":Math.PI/2});
testExpressionEvaluate("15-abs(6t-15)", {"t":2.5});//in projectile lab, this evaluates to -4.8...
