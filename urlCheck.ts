const checkUrls = async () => {
    const urls = [
        "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json",
        "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_asv.json",
        "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json",
        "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/json/t_kjv.json"
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url, { method: "HEAD" });
            console.log(`${url}: ${res.status}`);
        } catch (e) {
            console.log(`${url}: error`);
        }
    }
};
checkUrls();
