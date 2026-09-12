import argparse
import sys

from fut_card_creator.fut_card_creator import Player, Card


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', required=True)
    parser.add_argument('--ovr', required=True, type=int)
    parser.add_argument('--position', required=True)
    parser.add_argument('--photo', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    overall = args.ovr

    # Simple flat stat block for now - fut_card_creator adjusts stats to
    # match the overall anyway.
    stats = {
        "PAC": overall,
        "SHO": overall,
        "PAS": overall,
        "DRI": overall,
        "DEF": overall,
        "PHY": overall
    }

    player = Player(
        name=args.name,
        photo_path=args.photo,
        club="Free Agents",
        nation="England",
        overall=overall,
        position=args.position.upper(),
        stats=stats
    )

    card = Card(player, card_type="rare_gold")
    card.create_image()
    card.export_image(args.output)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f"CARD_GEN_ERROR: {error}", file=sys.stderr)
        sys.exit(1)