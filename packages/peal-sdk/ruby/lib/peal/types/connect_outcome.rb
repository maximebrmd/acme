# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConnectOutcome < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ConnectOutcomeConnected }, key: "CONNECTED"

      member -> { Peal::Types::ConnectOutcomeChoose }, key: "CHOOSE"
    end
  end
end
