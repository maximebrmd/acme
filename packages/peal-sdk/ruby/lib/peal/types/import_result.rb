# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportResult < Internal::Types::Model
      field :created, -> { Integer }, optional: false, nullable: false

      field :dry_run, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "dryRun"

      field :rows, -> { Internal::Types::Array[Peal::Types::ImportRowResult] }, optional: false, nullable: false
    end
  end
end
