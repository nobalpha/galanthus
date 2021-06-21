import sys
from bs4 import BeautifulSoup
import requests
import json
from urllib.parse import urlparse
import feedparser

file = open("./db/db.json", "r+")

data = json.load(file)

data["news"]["recurrent"] = []
data["reports"]["static"] = []

for datum in data["news"]["links"]:
    headers = {
        'User-Agent':
        'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36',
        "Upgrade-Insecure-Requests": "1",
        "DNT": "1",
        "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate"
    }
    response = requests.get(datum, headers=headers)
    soup = BeautifulSoup(response.content, "html.parser")

    head = soup.select(".latest-head > a")[:4]
    summary = soup.select(".latest-summary:last-child")[:4]
    hostname = '{uri.scheme}://{uri.netloc}'.format(uri=urlparse(datum))
    link = [f"{hostname}{x['href']}" for x in head]

    for i in range(len(head)):
        id = 0
        if len(data["news"]["recurrent"]):
            id = data["news"]["recurrent"][-1]["_id"] + 1

        data["news"]["recurrent"].append({
            "_id":
            id,
            "title":
            " ".join(head[i].text.split()),
            "description":
            " ".join(head[i].text.split()),
            "link":
            link[i]
        })

for datum in data["news"]["rss"]:
    id = 0
    if len(data["news"]["recurrent"]):
        id = data["news"]["recurrent"][-1]["_id"] + 1

    feed = feedparser.parse(datum)

    data["news"]["recurrent"].append({
        "_id":
        id,
        "title":
        BeautifulSoup(feed.entries[0]["title"], "lxml").text,
        "description":
        BeautifulSoup(feed.entries[0]["summary"], "lxml").text,
        "link":
        BeautifulSoup(feed.entries[0]["link"], "lxml").text
    })

for word in data["reports"]["keywords"]:
    feed = feedparser.parse(
        f"http://export.arxiv.org/api/query?search_query=all:{word}")
    for entry in feed.entries[:2]:
        id = 0
        if len(data["reports"]["static"]):
            id = data["reports"]["static"][-1]["_id"] + 1

        data["reports"]["static"].append({
            "_id":
            id,
            "title":
            BeautifulSoup(entry["title"], "lxml").text,
            "description":
            BeautifulSoup(entry["summary"], "lxml").text,
            "link":
            BeautifulSoup(entry["link"], "lxml").text
        })

file.seek(0)
json.dump(data, file, indent=2)
file.close()
