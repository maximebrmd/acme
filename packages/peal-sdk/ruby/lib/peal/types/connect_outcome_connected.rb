# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConnectOutcomeConnected < Internal::Types::Model
      field :channel, -> { Peal::Types::Channel }, optional: false, nullable: false
    end
  end
end
