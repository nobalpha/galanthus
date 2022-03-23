import sys
from bs4 import BeautifulSoup
import requests
import json
from urllib.parse import urlparse
import feedparser
import subprocess

file = open("./db/db.json", "r+")  # Opening the JSON database for read+write mode.

data = json.load(file)  # Loading it to a Python object.

data["news"]["recurrent"] = []  # Resetting news records.
data["reports"]["static"] = []  # Resetting reports records.

# Soup Section
for datum in data["news"]["links"]:  # Iterating over the predefined links.
    headers = {
        'User-Agent':
        'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36',
        "Upgrade-Insecure-Requests": "1",
        "DNT": "1",
        "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate"
    }  # A basic request header.
    response = requests.get(datum, headers=headers)  # Getting the news data from the link.
    soup = BeautifulSoup(response.content, "html.parser")  # Initializing the HTML parser.

    head = soup.select(".latest-head > a")[:4]  # Selecting the first four head section.
    summary = soup.select(".latest-summary:last-child")[:4]  # Selecting the first four summary section.
    # Treating the relative path links with defining the hostname.
    hostname = '{uri.scheme}://{uri.netloc}'.format(uri=urlparse(datum))
    link = [f"{hostname}{x['href']}" for x in head]  # Parsing the relative paths to full paths.

    for i in range(len(head)):
        id = 0
        if len(data["news"]["recurrent"]):  # If recurrent section exists.
            id = data["news"]["recurrent"][-1]["_id"] + 1  # Getting the current id by incrementing the maximum.

        data["news"]["recurrent"].append({
            "_id":
            id,
            "title":
            " ".join(head[i].text.split()),
            "description":
            " ".join(head[i].text.split()),
            "link":
            link[i]
        })  # Updating the database.

# RSS Section

for datum in data["news"]["rss"]:  # Iterating over the predefined RSS sources.
    id = 0
    if len(data["news"]["recurrent"]):  # If recurrent section exists.
        id = data["news"]["recurrent"][-1]["_id"] + 1  # Getting the current id by incrementing the maximum.
    try:
        feed = feedparser.parse(datum)  # Parsing the RSS XML feed
        data["news"]["recurrent"].append({
            "_id":
            id,
            "title":
            BeautifulSoup(feed.entries[0]["title"], "lxml").text,
            "description":
            BeautifulSoup(feed.entries[0]["summary"], "lxml").text,
            "link":
            feed.entries[0]["link"]
        })  # Updating the database.
    except Exception as e:
        print(e)

# Reports Section
for word in data["reports"]["keywords"]:  # Iterating over the predefined keywords.
    try:
        feed = feedparser.parse(
            f"http://export.arxiv.org/api/query?search_query=all:{word}")  # Querying report data by gathered keywords.
        for entry in feed.entries[:4]:  # Getting the first four entries.
            id = 0
            if len(data["reports"]["static"]):  # If recurrent section exists.
                id = data["reports"]["static"][-1]["_id"] + 1  # Getting the current id by incrementing the maximum.
            try:
                data["reports"]["static"].append({
                    "_id":
                    id,
                    "title":
                    BeautifulSoup(entry["title"], "lxml").text,
                    "description":
                    BeautifulSoup(entry["summary"], "lxml").text,
                    "link":
                    entry["link"]
                })  # Updating the database.
            except Exception as e:
                print(e)
    except Exception as e:
        print(e)

file.seek(0)  # Starting from the beginning of the database.
json.dump(data, file, indent=2)  # Writing the Python object to JSON file.
file.close()  # Closing the file :D

subprocess.run(["pm2", "restart", "0"])  # Restarting the background service.
