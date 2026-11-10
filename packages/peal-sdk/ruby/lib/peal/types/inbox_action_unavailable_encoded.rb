# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxActionUnavailableEncoded < Internal::Types::Model
      field :ability, -> { String }, optional: false, nullable: false

      field :standing, -> { Peal::Types::InboxActionUnavailableEncodedStanding }, optional: false, nullable: false
    end
  end
end
