const DECI_BASE_LOG = 4;
const DECI_BASE = 10000;
const DECI_WORD_BYTES = 2;
const DECI_UINTXX_ARRAY_CLASS = Uint16Array;

const _div_ceil = (a, b) => Math.ceil(a / b);

const DECI_EFORMAT = -1;
const DECI_ETOOBIG = -2;

const deci_strerror = (errno) => {
    switch (errno) {
    case DECI_EFORMAT: return "invalid number format";
    case DECI_ETOOBIG: return "number is too big";
    default: return null;
    }
};

const deci_from_str = (s, memory_view, i, out_max) => {
    const m = s.match(/^0*([0-9]*)$/);
    if (m === null)
        return DECI_EFORMAT;
    s = m[1];

    const ns = s.length;
    const nout = _div_ceil(ns, DECI_BASE_LOG);
    if (nout > out_max)
        return DECI_ETOOBIG;

    let si = ns;
    for (;;) {
        const si_1 = si - DECI_BASE_LOG;
        if (si_1 < 0)
            break;
        memory_view[i++] = parseInt(s.slice(si_1, si));
        si = si_1;
    }
    if (si !== 0) {
        memory_view[i++] = parseInt(s.slice(0, si));
    }
    return i;
};

const deci_to_str = (memory_view, i_begin, i_end) => {
    if (i_begin === i_end)
        return '0';

    --i_end;
    let s = memory_view[i_end].toString();

    while (i_end !== i_begin) {
        --i_end;
        s += (memory_view[i_end] + DECI_BASE).toString().slice(1);
    }

    return s;
};

const deci_normalize = (memory_view, i_begin, i_end) => {
    while (i_end !== i_begin && memory_view[i_end - 1] === 0)
        --i_end;
    return i_end;
};

const deci_zero_out = (memory_view, i_begin, i_end) => {
    for (let i = i_begin; i !== i_end; ++i)
        memory_view[i] = 0;
};

//---------------------------------------------------------------------------------------

class Span {
    constructor(i_begin, i_end) {
        this.i_begin = i_begin;
        this.i_end = i_end;
    }

    size() {
        return this.i_end - this.i_begin;
    }

    bytei_begin() {
        return this.i_begin * DECI_WORD_BYTES;
    }

    bytei_end() {
        return this.i_end * DECI_WORD_BYTES;
    }

    empty() {
        return this.i_end === this.i_begin;
    }
}

const ACTION_add = (instance, memory_view, a, b) => {
    if (a.size() < b.size()) {
        [a, b] = [b, a];
    }

    const carry = instance.exports.deci_add(
        a.bytei_begin(), a.bytei_end(),
        b.bytei_begin(), b.bytei_end());

    if (carry)
        memory_view[a.i_end++] = 1;

    return {result: a};
};

const ACTION_sub = (instance, memory_view, a, b) => {
    let neg = false;
    if (a.size() < b.size()) {
        [a, b] = [b, a];
        neg = true;
    }

    const underflow = instance.exports.deci_sub(
        a.bytei_begin(), a.bytei_end(),
        b.bytei_begin(), b.bytei_end());

    if (underflow)
        neg = !neg;

    a.i_end = deci_normalize(memory_view, a.i_begin, a.i_end);

    return {
        negative: neg && !a.empty(),
        result: a,
    };
};

const parse_forward = (s, memory_view, state) => {
    const i = state.i;
    const j = deci_from_str(s, memory_view, i, state.maxi - i);
    if (j < 0)
        throw new Error(deci_strerror(j));
    state.i = j;
    return new Span(i, j);
};

const stringify_span = (memory_view, a) => {
    return deci_to_str(memory_view, a.i_begin, a.i_end);
};

//---------------------------------------------------------------------------------------

const install_global_error_handler = (root_div) => {
    window.onerror = (error_msg, url, line_num, column_num, error_obj) => {
        root_div.prepend(`ERROR: ${error_msg} @ ${url}:${line_num}:${column_num}`);
        console.log('Error object:');
        console.log(error_obj);
        return false;
    };
};

const _from_html = (html) => {
    const tmpl = document.createElement('template');
    tmpl.innerHTML = html;
    return tmpl.content.firstChild;
};

const async_main = async (root_div) => {
    const { instance } = await WebAssembly.instantiateStreaming(
        fetch("./deci.wasm"));
    const memory = instance.exports.memory;
    const memory_view = new DECI_UINTXX_ARRAY_CLASS(memory.buffer);

    const form = _from_html(`
        <form>
            <div>
                <input
                    id="n1"
                    type="number"
                    required
                    value="59405769675091834891050553361823294268346042660263">
                </input>
            </div>
            <div>
                <select id="act" required>
                    <option value="add" selected>+</option>
                    <option value="sub">-</option>
                    <option value="mul">*</option>
                    <option value="div">/</option>
                    <option value="mod">%</option>
                </select>
            </div>
            <div>
                <input
                    id="n2"
                    type="number"
                    required
                    value="3805443826573967171090040429363839217988">
                </input>
            </div>
            <div>
                <input type="submit">=</input>
            </div>
            <div id="answer">
            </div>
        </form>
    `);

    form.onsubmit = () => {
        const s1 = form.getElementById('n1').value;
        const act = form.getElementById('act').value;
        const s2 = form.getElementById('n2').value;

        console.log(s1);
        console.log(act);
        console.log(s2);

        return false;
    };

    root_div.innerHTML = '';
    root_div.appendChild(form);

    //const parse_state = {i: 0, maxi: 65536};
    //const a_span = parse_forward('123456', memory_view, parse_state);
    //const b_span = parse_forward('7890', memory_view, parse_state);

    //const { result } = ACTION_add(instance, memory_view, a_span, b_span);

    //root_div.append(stringify_span(memory_view, result));
}

document.addEventListener('DOMContentLoaded', () => {
    const root_div = document.getElementById('root');
    install_global_error_handler(root_div);
    async_main(root_div)
        .catch((err) => {
            throw err;
        });
});
