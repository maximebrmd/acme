# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BoostStep < Internal::Types::Model
      field :finished_at, -> { String }, optional: false, nullable: true, api_name: "finishedAt"

      field :network_code, -> { String }, optional: false, nullable: true, api_name: "networkCode"

      field :outcome, -> { Peal::Types::BoostStepOutcome }, optional: false, nullable: true

      field :started_at, -> { String }, optional: false, nullable: false, api_name: "startedAt"

      field :step, -> { Peal::Types::BoostStepStep }, optional: false, nullable: false
    end
  end
end
