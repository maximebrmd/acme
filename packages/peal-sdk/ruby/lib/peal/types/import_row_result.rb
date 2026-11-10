# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportRowResult < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ImportRowResultCreated }, key: "CREATED"

      member -> { Peal::Types::ImportRowResultValid }, key: "VALID"

      member -> { Peal::Types::ImportRowResultRefused }, key: "REFUSED"

      member -> { Peal::Types::ImportRowResultUnreadable }, key: "UNREADABLE"
    end
  end
end
