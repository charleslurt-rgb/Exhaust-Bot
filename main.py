import logging
import os
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
PREFIX = os.getenv("BOT_PREFIX", "!")

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN is not set. Copy .env.example to .env and add your bot token.")

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("bot")

BASE_DIR = Path(__file__).resolve().parent


class Bot(commands.Bot):
    def __init__(self) -> None:
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        intents.presences = True

        super().__init__(
            command_prefix=PREFIX,
            intents=intents,
            help_command=None,
        )

    async def setup_hook(self) -> None:
        logger.info("Loading extensions...")

        commands_dir = BASE_DIR / "commands"

        for category in sorted(commands_dir.iterdir()):
            if not category.is_dir() or category.name.startswith("_"):
                continue

            for module in sorted(category.glob("*.py")):
                if module.name.startswith("_"):
                    continue

                extension = f"commands.{category.name}.{module.stem}"

                try:
                    await self.load_extension(extension)
                    logger.info("Loaded %s", extension)
                except Exception:
                    logger.exception("Failed to load %s", extension)

        # Global slash-command sync.
        synced = await self.tree.sync()
        logger.info("Synced %d slash commands.", len(synced))

    async def on_ready(self) -> None:
        logger.info("Logged in as %s (%s)", self.user, self.user.id)
        logger.info("Connected to %d guild(s).", len(self.guilds))


bot = Bot()


def main() -> None:
    logger.info("Starting bot...")
    bot.run(TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
