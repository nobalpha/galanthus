import sys
from bs4 import BeautifulSoup
import requests


def tagToAttribute(table_row):
    for (
        row
    ) in (
        table_row
    ):  # <tr> <td>Key: Specs name</td> <td>Value: Attributes value</td> </tr>
        print(
            row.find_all("td")[0]
            .text.rstrip()
            .replace("\n", ","),  # Selecting the specs column.
            row.find_all("td")[1]
            .text.rstrip()
            .replace("\n", ", "),  # Selecting the values column.
            end="\n",
        )


def main(scientific_name):
    # Sanitizing the scientific name with removing spaces.
    static_query = f"https://garden.org/plants/search/text/?q={'+'.join(scientific_name.split(' '))}"
    # Creating a dummy user agent file to tackle the robots.txt config.
    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0"

    response = requests.get(
        static_query, headers={"user-agent": user_agent}
    )  # Getting the results with the scientific name.
    soup = BeautifulSoup(
        response.content, "html.parser"
    )  # Initializing the HTML parser.
    href = soup.table.tbody.tr.select("td > a")[0][
        "href"
    ]  # table > tbody > tr > td > a[0][href]

    response = requests.get(
        f"https://garden.org{href}", headers={"user-agent": user_agent}
    )  # Getting the first result's specifications.
    soup = BeautifulSoup(
        response.content, "html.parser"
    )  # Initializing the HTML parser.
    table_row = soup.select("table:-soup-contains('General Plant Information')")[
        0
    ].find_all(
        "tr"
    )  # <table> Generalt Plant Information </table> > tr
    tagToAttribute(table_row)  # Calling the function for transfering tag to attribute.


main(sys.argv[1])  # Running the main function with the first system arguments.
