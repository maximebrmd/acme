# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeChannel < Internal::Types::Model
      field :handle, -> { String }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false
    end
  end
end
