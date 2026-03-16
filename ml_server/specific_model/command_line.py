import argparse


def parse_arguments():
    # Creatoin of a parser
    argument_parser = argparse.ArgumentParser(description="Waste model prediction")

    # Defintion of expected value
    argument_parser.add_argument("--mode", choices=["train", "predict"], required=True)
    argument_parser.add_argument("--csv", type=str, help="Path to csv training data")
    argument_parser.add_argument(
        "--model_path", type=str, help="Path to save and load model"
    )
    argument_parser.add_argument(
        "--input", type=str, help="Path to the input data for a prediction"
    )
    argument_parser.add_argument(
        "--output", type=str, help="Path to save the prediction results"
    )
    argument_parser.add_argument("--target", type=str, default=None)
    argument_parser.add_argument(
        "--date", type=str, help="Date for planning (YYYY-MM-DD)"
    )
    return argument_parser.parse_args()
