// Safe, deterministic formula parser: no eval, no dynamic code execution.
export function compileFormula(source, validCodes = []) {
  const src=String(source||''); const tokens=[]; let i=0;
  while(i<src.length){
    if(/\s/.test(src[i])){i++;continue;}
    const s=src.slice(i);
    if(src[i]==='['){const end=src.indexOf(']',i+1);if(end<0)throw Error('Thiếu dấu ] ở vị trí '+(i+1));const code=src.slice(i+1,end).trim();if(!code)throw Error('Mã tiêu chí trống');tokens.push({type:'ref',value:code});i=end+1;continue;}
    const num=s.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(num){tokens.push({type:'num',value:Number(num[0])});i+=num[0].length;continue;}
    const word=s.match(/^[a-zA-Z]+/);if(word){const v=word[0].toUpperCase();if(!['IF','AND','OR','NOT','TRUE','FALSE'].includes(v))throw Error('Hàm không hỗ trợ: '+v);tokens.push({type:'word',value:v});i+=word[0].length;continue;}
    const op=s.match(/^(>=|<=|!=|==|[+\-*\/%()>,<=])/);if(!op)throw Error('Ký tự không hợp lệ ở vị trí '+(i+1));tokens.push({type:'op',value:op[0]});i+=op[0].length;
  }
  if(tokens.length>500)throw Error('Công thức quá dài (tối đa 500 thành phần)');
  let p=0;const peek=()=>tokens[p]?.value;const eat=v=>{if(peek()===v){p++;return true}return false};
  const primary=()=>{const t=tokens[p++];if(!t)throw Error('Thiếu toán hạng');if(t.type==='num')return {t:'num',v:t.value};if(t.type==='ref'){if(validCodes.length&&!validCodes.includes(t.value))throw Error('Tiêu chí không thuộc mảng/đối tượng: '+t.value);return {t:'ref',v:t.value}};
    if(t.value==='('){const x=expression();if(!eat(')'))throw Error('Thiếu dấu )');return x;}
    if(t.value==='+'||t.value==='-')return {t:'unary',op:t.value,x:parse(7)};
    if(t.value==='TRUE'||t.value==='FALSE')return {t:'bool',v:t.value==='TRUE'};
    if(t.type==='word'){if(!eat('('))throw Error('Thiếu ( sau '+t.value);const args=[];if(!eat(')')){do{args.push(expression())}while(eat(','));if(!eat(')'))throw Error('Thiếu ) trong '+t.value)}const n={IF:3,AND:2,OR:2,NOT:1}[t.value];if(args.length!==n)throw Error(t.value+' cần '+n+' tham số');return {t:'call',op:t.value,args};}
    throw Error('Biểu thức không hợp lệ tại '+t.value);
  };
  const precedence={'OR':1,'AND':2,'=':3,'==':3,'!=':3,'>':3,'<':3,'>=':3,'<=':3,'+':4,'-':4,'*':5,'/':5};
  function parse(min=0){let left=primary();while(eat('%'))left={t:'percent',x:left};while(true){let op=peek();if(!(op in precedence)||precedence[op]<min)break;p++;const right=parse(precedence[op]+1);left={t:'bin',op,left,right};}return left;}
  function expression(){return parse(0)}
  if(!tokens.length)throw Error('Công thức trống');const ast=expression();if(p!==tokens.length)throw Error('Cú pháp không hợp lệ tại '+peek());
  return values=>{let count=0;function calc(n){if(++count>2000)throw Error('Công thức quá phức tạp');switch(n.t){case 'num':case 'bool':return n.v;case 'ref':{const v=Number(values[n.v]??0);if(!Number.isFinite(v))throw Error('Giá trị không hợp lệ: '+n.v);return v;}case 'unary':return n.op==='-'?-Number(calc(n.x)):Number(calc(n.x));case 'percent':return Number(calc(n.x))/100;case 'call':if(n.op==='IF')return calc(n.args[0])?calc(n.args[1]):calc(n.args[2]);if(n.op==='NOT')return !Boolean(calc(n.args[0]));if(n.op==='AND')return Boolean(calc(n.args[0]))&&Boolean(calc(n.args[1]));return Boolean(calc(n.args[0]))||Boolean(calc(n.args[1]));case 'bin':{if(n.op==='AND')return Boolean(calc(n.left))&&Boolean(calc(n.right));if(n.op==='OR')return Boolean(calc(n.left))||Boolean(calc(n.right));const a=calc(n.left),b=calc(n.right);switch(n.op){case '+':return Number(a)+Number(b);case '-':return Number(a)-Number(b);case '*':return Number(a)*Number(b);case '/':if(Number(b)===0)throw Error('Không thể chia cho 0');return Number(a)/Number(b);case '>':return a>b;case '<':return a<b;case '>=':return a>=b;case '<=':return a<=b;case '=':case '==':return a===b;case '!=':return a!==b;}}}}const out=calc(ast);if(typeof out!=='number'||!Number.isFinite(out))throw Error('Công thức phải trả về điểm số hữu hạn');return out;};
}
