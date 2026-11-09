# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnauthenticatedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::UnauthenticatedEncodedTag }, optional: false, nullable: false, api_name: "_tag"
    end
  end
end
