# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConnectFailedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ConnectFailedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :reason, -> { Peal::Types::ConnectFailureReason }, optional: false, nullable: false
    end
  end
end
