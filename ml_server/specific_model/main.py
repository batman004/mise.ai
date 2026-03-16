from training import train_main
from command_line import parse_arguments
from predict import predict_main_specific_model


if __name__ == "__main__":
    argument = parse_arguments()

    # Train mode
    if argument.mode == "train":
        train_main(argument)

    # Predict mode
    elif argument.mode == "predict":
        predict_main_specific_model(argument)
