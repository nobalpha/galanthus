import sys
from bs4 import BeautifulSoup
import requests


def rawToAttribute(soup, table_row):
    for row in table_row:
        print(row.find_all("td")[0].text.rstrip().replace("\n", ","),
              row.find_all("td")[1].text.rstrip().replace("\n", ", "),
              end="\n")


def main(scientific_name):
    api_query = f"https://garden.org/plants/search/text/?q={'+'.join(scientific_name.split(' '))}"
    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0"

    response = requests.get(api_query, headers={"user-agent": user_agent})
    soup = BeautifulSoup(response.content, "html.parser")
    href = soup.table.tbody.tr.select("td > a")[0]["href"]

    response = requests.get(f"https://garden.org{href}",
                            headers={"user-agent": user_agent})
    soup = BeautifulSoup(response.content, "html.parser")
    table_row = soup.select(
        "table:-soup-contains('General Plant Information')")[0].find_all("tr")
    rawToAttribute(soup, table_row)


if __name__ == "__main__":
    main(sys.argv[1])
