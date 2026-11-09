# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PeriodUsage < Internal::Types::Model
      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"

      field :used, -> { Integer }, optional: false, nullable: false
    end
  end
end
