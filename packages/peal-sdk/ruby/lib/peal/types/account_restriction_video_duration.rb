# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountRestrictionVideoDuration < Internal::Types::Model
      field :maximum_ms, -> { Integer }, optional: false, nullable: false, api_name: "maximumMs"
    end
  end
end
