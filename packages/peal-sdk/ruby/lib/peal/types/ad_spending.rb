# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdSpending < Internal::Types::Model
      field :account, -> { Peal::Types::AdAccount }, optional: false, nullable: false

      field :committed_this_month, -> { Integer }, optional: false, nullable: false, api_name: "committedThisMonth"
    end
  end
end
