import os
import logging

import discord
from discord.ext import commands
from dotenv import load_dotenv


load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN is not set.")


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("bot")


class Bot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True

        super().__init__(
            command_prefix="!",
            intents=intents,
        )

    async def setup_hook(self):
        logger.info("Bot setup complete.")

    async def on_ready(self):
        logger.info(
            "Logged in as %s (%s)",
            self.user,
            self.user.id,
        )


bot = Bot()


def main():
    bot.run(TOKEN)


if __name__ == "__main__":
    main()
