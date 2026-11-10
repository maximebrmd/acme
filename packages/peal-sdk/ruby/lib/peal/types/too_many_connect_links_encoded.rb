# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyConnectLinksEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::TooManyConnectLinksEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :allowed, -> { Integer }, optional: false, nullable: false
    end
  end
end
