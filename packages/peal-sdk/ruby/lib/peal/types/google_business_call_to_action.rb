# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module GoogleBusinessCallToAction
      extend Peal::Internal::Types::Enum

      BOOK = "book"
      ORDER = "order"
      SHOP = "shop"
      LEARN_MORE = "learnMore"
      SIGN_UP = "signUp"
      CALL = "call"
    end
  end
end
