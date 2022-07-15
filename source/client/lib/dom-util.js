export function newElement(type, info) {
    var el = document.createElement(type);

    if(info != null) {
        if(info.class != null) {
            if(Array.isArray(info.class)) {
                info.class.forEach(className => el.classList.add(className));
            } else {
                el.classList.add(info.class);
            }
        }

        if(info.id != null) {
            el.setAttribute("id", info.id);
        }

        if(info.text != null) {
            el.innerText = info.text;
        }

        if(info.data != null) {
            Object.keys(info.data).forEach(key => {
                let value = info.data[key];
                
                if(typeof value === 'object' && value !== null) {
                    el.dataset[key] = JSON.stringify(value);
                } else {
                    el.dataset[key] = value;
                }
            });
        }

        if(info.src != null) {
            el.src = info.src;
        }

        if(info.type != null) {
            el.type = info.type;
        }

        if(info.width != null) {
            el.width = info.width; 
        }

        if(info.height != null) {
            el.height = info.height;
        }
    }

    return el;
}

export function removeChildren(parent) {
    while(parent.hasChildNodes())
        parent.removeChild(parent.lastChild);
}

export function setChild(parent, child) {
    if(parent.hasChildNodes()) {
        let currentChild = parent.firstChild;
        parent.replaceChild(child, currentChild);
    } else {
        parent.appendChild(child);
    }
}

export function setChildren(parent, children) {
    removeChildren(parent);
    children.forEach(child => parent.appendChild(child));
}

export function getData(el, key) {
    let rawValue = el.dataset[key];

    try {
        let obj = JSON.parse(rawValue);
        return obj;
    } catch (e) {
        return rawValue;
    }
}

export function onClick(el, func) {
    el.addEventListener('click', event => func(event));
}

export function onEnterKey(el, func) {
    el.addEventListener('keypress', event => {
        if(event.key === 'Enter')
            func(event);
    });
}

export function onChange(el, func) {
    el.addEventListener('change', event => func(event));
}

export function enableElement(el) {
    el.removeAttribute('disabled');
}

export function disableElement(el) {
    el.setAttribute('disabled', 'disabled');
}

export function showElement(el) {
    el.style.display = 'block';
}

export function hideElement(el) {
    el.style.display = 'none';
}

export function appendAutoscroll(mainElement, parent, child) {
    //Scroll to bottom, from stackoverflow -- allow 1px inaccuracy by adding 1
    let out = mainElement;
    const isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1;

    parent.append(child);

    // scroll to bottom if isScrolledToBottom is true
    if (isScrolledToBottom) {
        out.scrollTop = out.scrollHeight - out.clientHeight;
    }
}