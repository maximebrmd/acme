# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BulkPostResult < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::BulkPostResultCreated }, key: "CREATED"

      member -> { Peal::Types::BulkPostResultRefused }, key: "REFUSED"
    end
  end
end
