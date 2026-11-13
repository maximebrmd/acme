# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountBand < Internal::Types::Model
      field :monthly, -> { Integer }, optional: false, nullable: false

      field :up_to, -> { Integer }, optional: false, nullable: true, api_name: "upTo"
    end
  end
end
