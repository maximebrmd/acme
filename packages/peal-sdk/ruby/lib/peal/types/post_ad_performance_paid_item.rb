# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostAdPerformancePaidItem < Internal::Types::Model
      field :account, -> { Peal::Types::AdAccount }, optional: false, nullable: false

      field :ads, -> { Integer }, optional: false, nullable: false

      field :totals, -> { Peal::Types::PaidTotals }, optional: false, nullable: false
    end
  end
end
