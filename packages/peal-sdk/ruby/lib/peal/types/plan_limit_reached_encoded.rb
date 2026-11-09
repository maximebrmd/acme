# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlanLimitReachedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::PlanLimitReachedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :allowed, -> { Integer }, optional: false, nullable: false

      field :limit, -> { Peal::Types::PlanLimit }, optional: false, nullable: false
    end
  end
end
