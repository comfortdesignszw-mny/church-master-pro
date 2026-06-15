const fetchStructure = async () => {
    try {
        const res = await fetch("https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json");
        const json = await res.json();
        console.log(Array.isArray(json));
        console.log("Keys if object:", Object.keys(json));
        if (Array.isArray(json)) {
            console.log("First item:", json[0].name, json[0].abbrev);
            console.log("Is chapters array:", Array.isArray(json[0].chapters));
            console.log("Chapter 1 verse 1:", json[0].chapters[0][0]);
        }
    } catch (e) {
        console.log(e);
    }
};
fetchStructure();
