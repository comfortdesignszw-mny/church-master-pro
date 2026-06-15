const fetchContents = async () => {
    try {
        const res = await fetch("https://api.github.com/repos/thiagobodruk/bible/contents/json");
        const json = await res.json();
        console.log(json.map((f: any) => f.name).filter((n: string) => n.startsWith("en")));
    } catch (e) {
        console.log(e);
    }
};
fetchContents();
